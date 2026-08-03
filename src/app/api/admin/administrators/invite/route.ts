import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/shared/error";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";

// #region agent log
const DBG_LOG_PATH = "/home/acer/Nextcloud/Techma AI/FFL Capital/.cursor/debug-a7fa28.log";
async function dbgLog(location: string, message: string, data: unknown, hypothesisId: string) {
  const line = JSON.stringify({ sessionId: "a7fa28", location, message, data, hypothesisId, timestamp: Date.now() });
  console.error(`[debug-a7fa28] ${line}`);
  fetch('http://127.0.0.1:7575/ingest/da5b7b85-ca12-43aa-a6b4-69544ae191ca',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a7fa28'},body:line}).catch(()=>{});
  try {
    const { appendFile } = await import("node:fs/promises");
    await appendFile(DBG_LOG_PATH, line + "\n");
  } catch {}
}
// #endregion

const inviteSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const { email } = parsed.data;
  // Derive from the actual incoming request rather than the NEXT_PUBLIC_APP_URL
  // secret, which can drift from the real published domain (see next.config.mjs).
  const redirectUrl = `${request.nextUrl.origin}/admin/sign-up`;

  const client = await clerkClient();

  try {
    const invitation = await client.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { role: "admin" },
      redirectUrl,
    });

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (err) {
    if (isClerkAPIResponseError(err)) {
      // #region agent log
      const dbgUsers = await client.users.getUserList({ emailAddress: [email], limit: 10 }).then(r => r.data.map(u => ({ id: u.id, emails: u.emailAddresses.map(e => e.emailAddress), role: (u.publicMetadata as Record<string, unknown>)?.role ?? null, partnerId: (u.publicMetadata as Record<string, unknown>)?.partnerId ?? null }))).catch(() => null);
      const dbgInvs = await client.invitations.getInvitationList({ limit: 100 }).then(r => r.data.filter(i => i.emailAddress?.toLowerCase() === email.toLowerCase()).map(i => ({ id: i.id, status: i.status, email: i.emailAddress, role: (i.publicMetadata as Record<string, unknown>)?.role ?? null }))).catch(() => null);
      await dbgLog('invite/route.ts:40', 'invite failed — clerk errors + matching users/invitations', { email, clerkErrors: err.errors.map(e => ({ code: e.code, message: e.message, longMessage: e.longMessage })), matchingUsers: dbgUsers, matchingInvitations: dbgInvs }, 'H1,H2,H4,H5');
      // #endregion
      const alreadyExists = err.errors.some(
        (e) => e.code === "form_identifier_exists" || e.code === "duplicate_record",
      );
      if (alreadyExists) {
        // Clerk blocks re-inviting an email that has ANY lingering invitation
        // record — even an already-accepted one from a removed account. Those
        // stale invitations are invisible in the admin UI (which only lists
        // pending ones). If no actual user account exists for this email,
        // revoke every lingering invitation and retry once with a fresh invite.
        const existingUsers = await client.users
          .getUserList({ emailAddress: [email], limit: 10 })
          .catch(() => null);
        if (existingUsers && existingUsers.data.length === 0) {
          const staleInvitations = await client.invitations
            .getInvitationList({ limit: 100 })
            .then((r) =>
              r.data.filter(
                (i) => i.emailAddress?.toLowerCase() === email.toLowerCase(),
              ),
            )
            .catch(() => []);
          // #region agent log
          await dbgLog('invite/route.ts:62', 'duplicate invite — revoking stale invitations and retrying', { email, revokingIds: staleInvitations.map(i => ({ id: i.id, status: i.status })) }, 'H2');
          // #endregion
          for (const inv of staleInvitations) {
            await client.invitations
              .revokeInvitation(inv.id)
              .catch((revokeErr) =>
                console.error(
                  "[admin/administrators/invite] failed to revoke stale invitation",
                  inv.id,
                  revokeErr,
                ),
              );
          }
          try {
            const invitation = await client.invitations.createInvitation({
              emailAddress: email,
              publicMetadata: { role: "admin" },
              redirectUrl,
            });
            // #region agent log
            await dbgLog('invite/route.ts:85', 're-invite after revoking stale invitations succeeded', { email, invitationId: invitation.id }, 'H2');
            // #endregion
            return NextResponse.json({ invitation }, { status: 201 });
          } catch (retryErr) {
            // #region agent log
            await dbgLog('invite/route.ts:88', 're-invite after revoking stale invitations failed', { email, error: String(retryErr) }, 'H2');
            // #endregion
            console.error(
              "[admin/administrators/invite] retry after revoking stale invitations failed",
              retryErr,
            );
          }
        }
        return NextResponse.json(
          {
            error:
              "This email already has an account and can't be re-invited. If they previously tried signing in and were denied, ask them to try signing in again — their old account was removed and they can now be invited normally.",
          },
          { status: 409 },
        );
      }
      const message = err.errors[0]?.longMessage ?? err.errors[0]?.message;
      return NextResponse.json(
        { error: message ?? "Failed to send invitation." },
        { status: 422 },
      );
    }

    console.error("[admin/administrators/invite] unexpected error", err);
    return NextResponse.json(
      { error: "Failed to send invitation. Please try again." },
      { status: 500 },
    );
  }
}
