import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/shared/error";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";

const inviteSchema = z.object({
  email: z.string().email(),
});

function logInvite(event: string, data: Record<string, unknown>) {
  console.error(`[admin/administrators/invite] ${event}`, JSON.stringify(data));
}

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

    logInvite("invitation_created", { email, invitationId: invitation.id });
    return NextResponse.json({ invitation }, { status: 201 });
  } catch (err) {
    if (isClerkAPIResponseError(err)) {
      const clerkErrors = err.errors.map((e) => ({
        code: e.code,
        message: e.message,
        longMessage: e.longMessage,
      }));
      const alreadyExists = err.errors.some(
        (e) => e.code === "form_identifier_exists" || e.code === "duplicate_record",
      );

      if (alreadyExists) {
        // Clerk blocks re-inviting an email that has ANY lingering invitation
        // record — even an already-accepted one from a removed account — OR
        // that already belongs to a live user (partner / orphan). Diagnose both
        // and recover when we can.
        const existingUsers = await client.users
          .getUserList({ emailAddress: [email], limit: 10 })
          .catch((lookupErr) => {
            logInvite("user_lookup_failed", {
              email,
              error: String(lookupErr),
            });
            return null;
          });

        const matchingUsers =
          existingUsers?.data.map((u) => ({
            id: u.id,
            emails: u.emailAddresses.map((e) => e.emailAddress),
            role:
              (u.publicMetadata as Record<string, unknown>)?.role ?? null,
            partnerId:
              (u.publicMetadata as Record<string, unknown>)?.partnerId ?? null,
          })) ?? [];

        const matchingInvitations = await client.invitations
          .getInvitationList({ limit: 100 })
          .then((r) =>
            r.data
              .filter(
                (i) =>
                  i.emailAddress?.toLowerCase() === email.toLowerCase(),
              )
              .map((i) => ({
                id: i.id,
                status: i.status,
                email: i.emailAddress,
                role:
                  (i.publicMetadata as Record<string, unknown>)?.role ?? null,
              })),
          )
          .catch((lookupErr) => {
            logInvite("invitation_lookup_failed", {
              email,
              error: String(lookupErr),
            });
            return [];
          });

        logInvite("invite_conflict", {
          email,
          clerkErrors,
          matchingUsers,
          matchingInvitations,
        });

        // Case 1: live non-admin account (e.g. partner) → promote in place.
        if (existingUsers && existingUsers.data.length > 0) {
          const existing = existingUsers.data[0];
          const existingMetadata =
            (existing.publicMetadata as Record<string, unknown>) ?? {};
          if (existingMetadata.role === "admin") {
            logInvite("already_admin", { email, userId: existing.id });
            return NextResponse.json(
              { error: "This email is already an administrator." },
              { status: 409 },
            );
          }
          await client.users.updateUserMetadata(existing.id, {
            publicMetadata: { ...existingMetadata, role: "admin" },
          });
          logInvite("promoted_existing_user", {
            email,
            userId: existing.id,
            previousRole: existingMetadata.role ?? null,
            partnerId: existingMetadata.partnerId ?? null,
          });
          return NextResponse.json(
            { promoted: true, userId: existing.id },
            { status: 200 },
          );
        }

        // Case 2: no user, but stale invitation records → revoke + retry.
        if (existingUsers && existingUsers.data.length === 0) {
          logInvite("revoking_stale_invitations", {
            email,
            revoking: matchingInvitations,
          });
          for (const inv of matchingInvitations) {
            await client.invitations
              .revokeInvitation(inv.id)
              .catch((revokeErr) =>
                logInvite("revoke_stale_invitation_failed", {
                  email,
                  invitationId: inv.id,
                  status: inv.status,
                  error: String(revokeErr),
                }),
              );
          }
          try {
            const invitation = await client.invitations.createInvitation({
              emailAddress: email,
              publicMetadata: { role: "admin" },
              redirectUrl,
            });
            logInvite("reinvite_after_revoke_succeeded", {
              email,
              invitationId: invitation.id,
            });
            return NextResponse.json({ invitation }, { status: 201 });
          } catch (retryErr) {
            const retryErrors = isClerkAPIResponseError(retryErr)
              ? retryErr.errors.map((e) => ({
                  code: e.code,
                  message: e.message,
                  longMessage: e.longMessage,
                }))
              : [{ message: String(retryErr) }];
            logInvite("reinvite_after_revoke_failed", {
              email,
              retryErrors,
            });
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

      logInvite("clerk_invite_rejected", { email, clerkErrors });
      const message = err.errors[0]?.longMessage ?? err.errors[0]?.message;
      return NextResponse.json(
        { error: message ?? "Failed to send invitation." },
        { status: 422 },
      );
    }

    logInvite("unexpected_error", { email, error: String(err) });
    return NextResponse.json(
      { error: "Failed to send invitation. Please try again." },
      { status: 500 },
    );
  }
}
