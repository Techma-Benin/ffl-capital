import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireSuperAdmin } from "@/lib/auth/session";
import { getRoleFromMetadata } from "@/lib/auth/roles";

/**
 * POST /api/admin/administrators/[id]/remove — revoke another user's admin
 * access. Only the super admin may do this; self-removal is blocked.
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

  const { role: _role, isSuperAdmin: _isSuperAdmin, ...rest } = targetMetadata;
  await client.users.updateUserMetadata(id, {
    publicMetadata: rest,
  });

  return NextResponse.json({ ok: true });
}
