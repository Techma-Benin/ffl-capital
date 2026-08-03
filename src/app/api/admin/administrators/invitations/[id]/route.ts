import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/shared/error";
import { requireAdmin } from "@/lib/auth/session";

/**
 * DELETE /api/admin/administrators/invitations/[id] — revoke an admin
 * invitation. Works on pending invitations and clears stale
 * accepted/expired records that block re-invites. Open to any admin,
 * matching who can send invitations.
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
    const clerkMessage =
      isClerkAPIResponseError(err)
        ? (err.errors[0]?.longMessage ?? err.errors[0]?.message)
        : null;
    return NextResponse.json(
      { error: clerkMessage ?? "Failed to revoke invitation. Please try again." },
      { status: 500 },
    );
  }
}
