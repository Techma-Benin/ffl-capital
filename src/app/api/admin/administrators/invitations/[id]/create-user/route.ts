import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { requireAdmin } from "@/lib/auth/session";

function logCreateUser(event: string, data: Record<string, unknown>) {
  console.error(
    `[admin/administrators/invitations/create-user] ${event}`,
    JSON.stringify(data),
  );
}

function randomPassword(): string {
  const bytes = new Uint8Array(18);
  globalThis.crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

/**
 * POST /api/admin/administrators/invitations/[id]/create-user — recover an
 * accepted-but-orphaned admin invitation by creating a Clerk user with
 * publicMetadata.role = "admin". Clerk cannot revoke accepted invites, and
 * the invitee cannot sign in until a real user exists.
 */
export async function POST(
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
    const invitationsResponse = await client.invitations.getInvitationList({
      query: id,
      limit: 100,
    });
    const invitation = invitationsResponse.data.find((inv) => inv.id === id);

    if (!invitation) {
      logCreateUser("invitation_not_found", { invitationId: id });
      return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    }

    const role = (invitation.publicMetadata as Record<string, unknown>)?.role;
    if (role !== "admin") {
      logCreateUser("not_admin_invitation", {
        invitationId: id,
        role: role ?? null,
      });
      return NextResponse.json(
        { error: "Not an admin invitation." },
        { status: 400 },
      );
    }

    if (invitation.status !== "accepted") {
      logCreateUser("invitation_not_accepted", {
        invitationId: id,
        status: invitation.status ?? null,
      });
      return NextResponse.json(
        {
          error:
            "Only accepted invitations can be recovered this way. Revoke or re-invite for other statuses.",
        },
        { status: 400 },
      );
    }

    const email = invitation.emailAddress;
    const existingUsers = await client.users.getUserList({
      emailAddress: [email],
      limit: 10,
    });

    if (existingUsers.data.length > 0) {
      const existing = existingUsers.data[0];
      const existingRole =
        (existing.publicMetadata as Record<string, unknown>)?.role ?? null;
      logCreateUser("user_already_exists", {
        invitationId: id,
        email,
        userId: existing.id,
        role: existingRole,
      });
      if (existingRole === "admin") {
        return NextResponse.json(
          { error: "An admin account already exists for this email." },
          { status: 409 },
        );
      }
      return NextResponse.json(
        {
          error:
            "A non-admin account already exists for this email. Use Invite admin to promote them.",
        },
        { status: 409 },
      );
    }

    let user;
    let passwordless = true;
    try {
      user = await client.users.createUser({
        emailAddress: [email],
        publicMetadata: { role: "admin" },
        skipPasswordRequirement: true,
      });
    } catch (createErr) {
      // Instance may require a password when password is the only sign-in
      // method. Fall back to a random unusable password; the user can sign
      // in via Google SSO or Clerk's forgot-password flow.
      const clerkErrors = isClerkAPIResponseError(createErr)
        ? createErr.errors.map((e) => ({
            code: e.code,
            message: e.message,
            longMessage: e.longMessage,
          }))
        : null;
      logCreateUser("passwordless_create_failed_retrying", {
        invitationId: id,
        email,
        clerkErrors,
        error: String(createErr),
      });
      const password = randomPassword();
      user = await client.users.createUser({
        emailAddress: [email],
        password,
        publicMetadata: { role: "admin" },
        skipPasswordChecks: true,
      });
      passwordless = false;
    }

    logCreateUser("user_created", {
      invitationId: id,
      email,
      userId: user.id,
      passwordless,
    });
    return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
  } catch (err) {
    const clerkErrors = isClerkAPIResponseError(err)
      ? err.errors.map((e) => ({
          code: e.code,
          message: e.message,
          longMessage: e.longMessage,
        }))
      : null;
    logCreateUser("create_failed", {
      invitationId: id,
      clerkErrors,
      error: String(err),
    });
    const clerkMessage =
      clerkErrors?.[0]?.longMessage ?? clerkErrors?.[0]?.message ?? null;
    return NextResponse.json(
      {
        error:
          clerkMessage ?? "Failed to create admin account. Please try again.",
      },
      { status: 500 },
    );
  }
}
