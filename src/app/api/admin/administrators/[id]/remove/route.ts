import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireSuperAdmin } from "@/lib/auth/session";
import { getRoleFromMetadata } from "@/lib/auth/roles";

/**
 * POST /api/admin/administrators/[id]/remove — permanently delete another
 * admin's Clerk account, revoking all access. Only the super admin may do
 * this; self-removal is blocked. This is destructive and irreversible — the
 * account must be re-invited from scratch to regain access.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireSuperAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const { id } = await params;

  if (id === authResult.userId) {
    return NextResponse.json(
      { error: "You can't remove your own admin access." },
      { status: 400 },
    );
  }

  const client = await clerkClient();
  const target = await client.users.getUser(id);
  const targetMetadata = target.publicMetadata as Record<string, unknown>;

  if (getRoleFromMetadata(targetMetadata) !== "admin") {
    return NextResponse.json(
      { error: "That user is not an admin." },
      { status: 400 },
    );
  }

  // Permanently delete the account rather than clearing its role. Clerk's
  // updateUserMetadata merges top-level keys into existing metadata instead
  // of replacing it, so omitting `role` from the payload does not remove it —
  // the account would keep admin access. Deleting the account sidesteps that
  // entirely and guarantees access is actually revoked.
  await client.users.deleteUser(id);

  return NextResponse.json({ ok: true });
}
