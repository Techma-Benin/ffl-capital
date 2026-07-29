import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/auth/session";

/**
 * DELETE /api/admin/administrators/invitations/[id] — revoke a pending admin
 * invitation. Open to any admin, matching who can send invitations.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const { id } = await params;
  const client = await clerkClient();

  try {
    await client.invitations.revokeInvitation(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/administrators/invitations] revoke failed", err);
    return NextResponse.json(
      { error: "Failed to revoke invitation. Please try again." },
      { status: 500 },
    );
  }
}
