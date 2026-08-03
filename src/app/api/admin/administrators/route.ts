import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/auth/session";
import { isSuperAdminFromMetadata } from "@/lib/auth/roles";

export async function GET() {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const client = await clerkClient();

  // Fetch all users with admin role
  const usersResponse = await client.users.getUserList({ limit: 100 });
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

  // All admin invitations (any status) — stale accepted/expired records used
  // to be filtered out, which made re-invite blockers invisible in the UI.
  const invitationsResponse = await client.invitations.getInvitationList({
    limit: 100,
  });
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
      status: inv.status ?? null,
    }));

  return NextResponse.json({ admins, pendingInvites });
}
