/**
 * Next.js instrumentation hook — runs once when the server starts.
 *
 * 1. Auto-provisions every email in ADMIN_EMAILS as a Clerk admin (idempotent).
 * 2. Ensures the first email in ADMIN_EMAILS holds the super admin title
 *    whenever no one currently does (idempotent bootstrap).
 * 3. Schedules the IntegrityConnect post cron (every 15 minutes).
 * 4. Registers the Clerk Frontend-API proxy URL on the production domain
 *    (idempotent) — ensures invite-link ticket consumption works without
 *    requiring a manual one-time setup call after each deploy.
 */

/**
 * For each email in ADMIN_EMAILS: promote to admin if the Clerk account already
 * exists, or create a new account with admin role if it doesn't.
 * Logs the generated password so it can be retrieved from deployment logs.
 * Safe to call on every startup — exits early when already provisioned.
 *
 * Once every ADMIN_EMAILS account exists, ensures exactly one super admin:
 * if nobody currently holds the title (fresh deploy, or the flag was lost),
 * the first email in ADMIN_EMAILS is granted it. If a super admin already
 * exists — including one who received the title via an in-app transfer —
 * this step is a no-op, so transfers survive future restarts/deploys.
 */
async function provisionAdminAccounts() {
  const raw = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "";
  const emails = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) return;

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.warn("[startup] ADMIN_EMAILS is set but CLERK_SECRET_KEY is missing — skipping admin provisioning.");
    return;
  }

  const { createClerkClient } = await import("@clerk/nextjs/server");
  const clerk = createClerkClient({ secretKey });

  for (const email of emails) {
    try {
      const { data: existing } = await clerk.users.getUserList({ emailAddress: [email] });

      if (existing.length > 0) {
        const user = existing[0];
        if (user.publicMetadata?.role === "admin") continue; // already done
        await clerk.users.updateUserMetadata(user.id, {
          publicMetadata: { ...(user.publicMetadata ?? {}), role: "admin" },
        });
        console.info(`[startup] promoted ${email} to admin (userId: ${user.id})`);
      } else {
        const bytes = new Uint8Array(12);
        globalThis.crypto.getRandomValues(bytes);
        const password = Buffer.from(bytes).toString("base64url");
        const user = await clerk.users.createUser({
          emailAddress: [email],
          password,
          firstName: "Admin",
          lastName: "",
          publicMetadata: { role: "admin" },
          skipPasswordChecks: true,
        });
        console.info(
          `[startup] created admin account — email: ${email}  userId: ${user.id}  password: ${password}`,
        );
      }
    } catch (err: unknown) {
      const msg = (err as { errors?: unknown; message?: string })?.errors
        ?? (err as { message?: string })?.message
        ?? err;
      console.error(`[startup] failed to provision admin ${email}:`, msg);
    }
  }

  await ensureSuperAdminBootstrap(clerk, emails[0]);
}

/**
 * Grants the super admin title to `firstAdminEmail` if — and only if — no
 * admin currently holds it. This runs on every startup so a freshly
 * published deploy (or a wiped/reset user base) always ends up with a super
 * admin without a manual script step, while a title already transferred
 * in-app to someone else is left untouched.
 */
async function ensureSuperAdminBootstrap(
  clerk: Awaited<ReturnType<typeof import("@clerk/nextjs/server").createClerkClient>>,
  firstAdminEmail: string,
) {
  try {
    const { data: allUsers } = await clerk.users.getUserList({ limit: 100 });
    const admins = allUsers.filter((u) => u.publicMetadata?.role === "admin");

    const hasSuperAdmin = admins.some((u) => u.publicMetadata?.isSuperAdmin === true);
    if (hasSuperAdmin) return;

    const target = admins.find((u) =>
      u.emailAddresses.some((e) => e.emailAddress.toLowerCase() === firstAdminEmail),
    );
    if (!target) {
      console.warn(
        `[startup] No super admin exists and ${firstAdminEmail} (first ADMIN_EMAILS entry) has no admin account yet — skipping super admin bootstrap.`,
      );
      return;
    }

    await clerk.users.updateUserMetadata(target.id, {
      publicMetadata: { ...(target.publicMetadata ?? {}), role: "admin", isSuperAdmin: true },
    });
    console.info(`[startup] granted super admin to ${firstAdminEmail} (userId: ${target.id})`);
  } catch (err: unknown) {
    const msg = (err as { errors?: unknown; message?: string })?.errors
      ?? (err as { message?: string })?.message
      ?? err;
    console.error("[startup] super admin bootstrap failed:", msg);
  }
}

/**
 * Registers the Clerk Frontend-API proxy URL on the primary Clerk domain so
 * that proxied requests (handled by src/middleware.ts's frontendApiProxy) are
 * accepted by Clerk's edge. This is a one-time, idempotent operation that must
 * be run once per environment after the proxy code is deployed — doing it
 * automatically on every startup avoids "forgot to run the setup endpoint"
 * errors across redeploys.
 *
 * Only runs in production because:
 * 1. frontendApiProxy is disabled outside production (see middleware.ts).
 * 2. Clerk does not support FAPI proxying for development instances.
 *
 * Origin resolution order:
 * - REPLIT_DOMAINS: injected by Replit's runtime into the production container
 *   with the app's actual live domain (e.g. workspace.masdouk1.replit.app).
 *   This is the most reliable source because it reflects what the production
 *   deployment is actually reachable at.
 * - NEXT_PUBLIC_APP_URL: a manually-set secret that may drift from the real
 *   domain; used as a fallback if REPLIT_DOMAINS is not present.
 */
async function registerClerkProxy() {
  if (process.env.NODE_ENV !== "production") return;

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.warn("[startup] CLERK_SECRET_KEY missing — skipping Clerk proxy registration.");
    return;
  }

  // Derive the live origin. REPLIT_DOMAINS in the deployed container holds the
  // production domain(s) as a comma-separated list; take the first.
  const replitDomains = process.env.REPLIT_DOMAINS ?? "";
  const firstDomain = replitDomains.split(",").map((d) => d.trim()).find(Boolean);
  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const origin = firstDomain
    ? `https://${firstDomain}`
    : rawAppUrl
      ? rawAppUrl.replace(/\/$/, "")
      : null;

  if (!origin) {
    console.warn(
      "[startup] Cannot determine production origin for Clerk proxy registration " +
      "(REPLIT_DOMAINS and NEXT_PUBLIC_APP_URL are both empty). " +
      "Set NEXT_PUBLIC_APP_URL to the production URL and redeploy.",
    );
    return;
  }

  const proxyUrl = `${origin}/api/__clerk`;

  try {
    const { createClerkClient } = await import("@clerk/nextjs/server");
    const clerk = createClerkClient({ secretKey });

    const { data: domains } = await clerk.domains.list();
    const primary = domains.find((d) => !d.isSatellite);
    if (!primary) {
      console.warn("[startup] No primary Clerk domain found — skipping proxy registration.");
      return;
    }

    // Idempotent: only PATCH if the proxy_url needs to change.
    if (primary.proxyUrl === proxyUrl) {
      console.info(`[startup] Clerk proxy already registered: ${proxyUrl}`);
      return;
    }

    const updated = await clerk.domains.update({
      domainId: primary.id,
      proxy_url: proxyUrl,
    });

    console.info(
      `[startup] Clerk proxy URL registered — domain: ${updated.name}  proxyUrl: ${updated.proxyUrl}`,
    );
  } catch (err: unknown) {
    const msg =
      (err as { errors?: unknown })?.errors ??
      (err as { message?: string })?.message ??
      err;
    console.error("[startup] Clerk proxy registration failed:", msg);
  }
}

export async function register() {
  // Only run in the Node.js runtime (not Edge, not during builds)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Provision admin accounts from ADMIN_EMAILS on every startup (idempotent).
  provisionAdminAccounts().catch((err) =>
    console.error("[startup] admin provisioning error:", err),
  );

  // Register Clerk FAPI proxy URL so invite-link ticket consumption works in
  // production (idempotent — only PATCHes if the value has changed).
  registerClerkProxy().catch((err) =>
    console.error("[startup] Clerk proxy registration error:", err),
  );

  const INTERVAL_MS = parseInt(process.env.CRON_INTERVAL_MS ?? "", 10) || 15 * 60 * 1000; // default 15 min, override via env

  // Single combined job (docs/BACKEND.md): unmatched leads younger than the
  // configured delay get a retry match attempt; older ones are escalated to
  // IntegrityCONNECT. See src/lib/jobs/reprocess-unmatched.ts. Respects the
  // "Reprocessing enabled" admin setting, which can pause the whole flow.
  //
  // This calls the job over HTTP (self-request to the cron route) rather
  // than importing reprocessUnmatchedLeads() directly. That job's dependency
  // chain (matching engine -> lead delivery -> outbound URL guard) uses
  // Node-only built-ins (node:dns/promises, node:net). instrumentation.ts is
  // compiled for both the Node.js and Edge runtimes, and even a dynamic
  // import of that chain gets traced into the Edge bundle in dev, which
  // fails to build ("UnhandledSchemeError: node:dns/promises"). Going over
  // HTTP keeps instrumentation.ts's module graph Edge-safe and exercises the
  // exact same authenticated path an external scheduler would use.
  async function runReprocessCron() {
    try {
      const port = process.env.PORT || "5000";
      const secret =
        process.env.CRON_SECRET ??
        (process.env.NODE_ENV === "development" ? "dev-cron-secret" : undefined);
      if (!secret) {
        console.warn("[cron] reprocess-unmatched: CRON_SECRET not set, skipping");
        return;
      }
      const res = await fetch(`http://127.0.0.1:${port}/api/cron/reprocess-unmatched`, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
      });
      const result = await res.json().catch(() => null);
      if (!res.ok) {
        console.error("[cron] reprocess-unmatched failed:", res.status, result);
        return;
      }
      console.info("[cron] reprocess-unmatched:", result);
    } catch (err) {
      console.error("[cron] reprocess-unmatched failed:", err);
    }
  }

  // Guard against overlapping runs on the same instance.
  let cronRunning = false;
  async function guardedCronRun() {
    if (cronRunning) {
      console.warn("[cron] reprocess-unmatched: previous run still in progress, skipping");
      return;
    }
    cronRunning = true;
    try {
      await runReprocessCron();
    } finally {
      cronRunning = false;
    }
  }

  setInterval(guardedCronRun, INTERVAL_MS);
  // Also run once shortly after startup (delayed so the HTTP server is
  // actually accepting connections before we self-request it) so the flow
  // doesn't wait a full interval before its first pass on a freshly
  // (re)started instance.
  setTimeout(guardedCronRun, 5000);

  console.info(
    `[cron] reprocess-unmatched scheduler registered (every ${INTERVAL_MS / 60000} min)`,
  );
}
