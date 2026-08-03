import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/auth/session";
import { isSuperAdminFromMetadata } from "@/lib/auth/roles";

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

export async function GET() {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const client = await clerkClient();

  // Fetch all users with admin role
  const usersResponse = await client.users.getUserList({ limit: 100 });
  // #region agent log
  await dbgLog('administrators/route.ts:15', 'all clerk users snapshot', { totalUsers: usersResponse.data.length, users: usersResponse.data.map(u => ({ id: u.id, emails: u.emailAddresses.map(e => e.emailAddress), role: (u.publicMetadata as Record<string, unknown>)?.role ?? null })) }, 'H1,H3,H4');
  // #endregion
  const admins = usersResponse.data
    .filter(
      (u) =>
        (u.publicMetadata as Record<string, unknown>)?.role === "admin",
    )
    .map((u) => ({
      id: u.id,
      email: u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)
        ?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? "",
      imageUrl: u.imageUrl,
      lastSignInAt: u.lastSignInAt ?? null,
      type: "admin" as const,
      isSuperAdmin: isSuperAdminFromMetadata(
        u.publicMetadata as Record<string, unknown>,
      ),
    }));

  // Fetch pending invitations with admin role
  const invitationsResponse = await client.invitations.getInvitationList({
    status: "pending",
  });
  // #region agent log
  const dbgAllInvs = await client.invitations.getInvitationList({ limit: 100 }).catch(() => null);
  await dbgLog('administrators/route.ts:36', 'all clerk invitations snapshot', { pendingCount: invitationsResponse.data.length, allInvitations: dbgAllInvs?.data.map(i => ({ id: i.id, email: i.emailAddress, status: i.status, role: (i.publicMetadata as Record<string, unknown>)?.role ?? null })) ?? null }, 'H2');
  // #endregion
  const pendingInvites = invitationsResponse.data
    .filter(
      (inv) =>
        (inv.publicMetadata as Record<string, unknown>)?.role === "admin",
    )
    .map((inv) => ({
      id: inv.id,
      email: inv.emailAddress,
      imageUrl: null,
      lastSignInAt: null,
      type: "invited" as const,
    }));

  return NextResponse.json({ admins, pendingInvites });
}
