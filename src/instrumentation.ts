/**
 * Next.js instrumentation hook — runs once when the server starts.
 *
 * 1. Auto-provisions every email in ADMIN_EMAILS as a Clerk admin (idempotent).
 * 2. Schedules the IntegrityConnect post cron (every 15 minutes).
 * 3. Registers the Clerk Frontend-API proxy URL on the production domain
 *    (idempotent) — ensures invite-link ticket consumption works without
 *    requiring a manual one-time setup call after each deploy.
 */

/**
 * For each email in ADMIN_EMAILS: promote to admin if the Clerk account already
 * exists, or create a new account with admin role if it doesn't.
 * Logs the generated password so it can be retrieved from deployment logs.
 * Safe to call on every startup — exits early when already provisioned.
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

  const { createClerkClient } = await import("@clerk/backend");
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
    const { createClerkClient } = await import("@clerk/backend");
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

  async function runIntegrityPostCron() {
    try {
      const { prisma } = await import("@/lib/db");
      const { LeadStatus } = await import("@prisma/client");
      const { integrityPostLead } = await import("@/lib/integrity/post");
      const { getIntegrityPostDelayHours } = await import(
        "@/lib/settings/app-settings"
      );

      const delayHours = await getIntegrityPostDelayHours();
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - delayHours);

      const leads = await prisma.lead.findMany({
        where: {
          status: LeadStatus.unmatched,
          available: true,
          receivedAt: { lte: cutoff },
        },
        take: 25,
      });

      let posted = 0;
      const errors: string[] = [];

      for (const lead of leads) {
        const result = await integrityPostLead(lead.id);
        if (result.posted) posted++;
        else if (result.reason) errors.push(`${lead.id}: ${result.reason}`);
      }

      console.info("[cron] integrity-post:", { attempted: leads.length, posted, errors });
    } catch (err) {
      console.error("[cron] integrity-post failed:", err);
    }
  }

  // Guard against overlapping runs on the same instance.
  let cronRunning = false;
  async function guardedCronRun() {
    if (cronRunning) {
      console.warn("[cron] integrity-post: previous run still in progress, skipping");
      return;
    }
    cronRunning = true;
    try {
      await runIntegrityPostCron();
    } finally {
      cronRunning = false;
    }
  }

  setInterval(guardedCronRun, INTERVAL_MS);

  console.info(
    `[cron] integrity-post scheduler registered (every ${INTERVAL_MS / 60000} min)`,
  );
}
