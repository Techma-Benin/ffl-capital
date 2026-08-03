import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/shared/error";
import { ShieldWarning } from "@/lib/icons/ssr";
import Link from "next/link";
import { getRoleFromMetadata } from "@/lib/auth/roles";
import { getPartnerId } from "@/lib/partner/session";
import { AccessDeniedSignOutButton } from "./sign-out-button";

/**
 * Reached whenever a signed-in user isn't an admin (either right after
 * sign-in, or by hitting an /admin/* URL directly). Google/email sign-in
 * always creates a real Clerk account first — role is only checked
 * afterwards — so a denied attempt can leave behind an account that isn't
 * tied to anything (no admin role, no partner profile). We remove those
 * orphaned accounts here so they don't collide later when an admin tries to
 * invite that same email (Clerk refuses to invite an email that already has
 * an account). Partner accounts are never touched.
 */
async function resolveDenialReason(): Promise<"partner" | "orphan" | "unauthenticated"> {
  const { userId, sessionId } = await auth();
  if (!userId) return "unauthenticated";

  let user;
  try {
    user = await currentUser();
  } catch (err) {
    // The account may have already been removed by an earlier request for
    // this same denied attempt (double render, prefetch, refresh after the
    // first visit already cleaned it up). Clerk's Backend API 404s when
    // asked for a deleted user — treat that the same as "already handled"
    // instead of letting the page crash.
    if (isClerkAPIResponseError(err) && err.status === 404) {
      return "orphan";
    }
    throw err;
  }

  const role = getRoleFromMetadata(user?.publicMetadata as Record<string, unknown>);
  if (role === "partner") return "partner";

  const partnerId = await getPartnerId();
  if (partnerId) return "partner";

  try {
    const client = await clerkClient();
    // Revoke the browser session before deleting the user so client-side
    // sign-out / redirect is not stuck on a zombie JWT for a missing user.
    if (sessionId) {
      try {
        await client.sessions.revokeSession(sessionId);
      } catch (err) {
        console.error("[admin/access-denied] failed to revoke orphan session", err);
      }
    }
    await client.users.deleteUser(userId);
  } catch (err) {
    console.error("[admin/access-denied] failed to remove orphan account", err);
    // #region agent log
    const dbgLine = JSON.stringify({ sessionId: "a7fa28", location: "access-denied/page.tsx:57", message: "orphan account cleanup failed", data: { userId, error: String(err) }, hypothesisId: "H3", timestamp: Date.now() });
    console.error(`[debug-a7fa28] ${dbgLine}`);
    try { const { appendFile } = await import("node:fs/promises"); await appendFile("/home/acer/Nextcloud/Techma AI/FFL Capital/.cursor/debug-a7fa28.log", dbgLine + "\n"); } catch {}
    // #endregion
  }
  return "orphan";
}

export default async function AdminAccessDeniedPage() {
  const reason = await resolveDenialReason();

  const copy =
    reason === "orphan"
      ? "You haven't been invited to the admin portal, so this account can't access it. Ask your platform administrator to add you as an administrator, then sign in again."
      : "This account is not authorized for the admin portal. Contact your platform administrator or sign in with an approved admin email.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="card max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <ShieldWarning size={24} className="text-amber-700" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Admin access denied</h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">{copy}</p>
        <div className="mt-6 flex flex-col gap-3">
          {reason === "partner" && (
            <Link href="/sign-in" className="btn-secondary justify-center">
              Partner portal sign in
            </Link>
          )}
          <AccessDeniedSignOutButton className="btn-ghost justify-center text-sm text-slate-600" />
        </div>
      </div>
    </div>
  );
}
