import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireSuperAdmin } from "@/lib/auth/session";
import { getRoleFromMetadata } from "@/lib/auth/roles";

/**
 * POST /api/admin/administrators/[id]/transfer-super-admin — grant the super
 * admin title to another admin and revoke it from the caller, atomically.
 * Only the current super admin may do this.
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
      { error: "You're already the super admin." },
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

  // Grant to the target first, then revoke from the caller — if the second
  // step failed we'd rather have two super admins briefly than zero.
  await client.users.updateUserMetadata(id, {
    publicMetadata: { ...targetMetadata, role: "admin", isSuperAdmin: true },
  });

  const currentMetadata = authResult.user?.publicMetadata as
    | Record<string, unknown>
    | undefined;
  await client.users.updateUserMetadata(authResult.userId, {
    publicMetadata: { ...currentMetadata, isSuperAdmin: false },
  });

  return NextResponse.json({ ok: true });
}
