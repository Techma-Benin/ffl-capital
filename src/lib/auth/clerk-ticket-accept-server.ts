import { clerkClient } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import {
  buildRedirect,
  defaultSignUpPath,
  resolveClerkTicketAcceptRedirectFromPayload,
} from "@/lib/auth/clerk-ticket-accept";

async function resolveRedirectUrlFromInvitation(
  ticket: string,
  origin: string,
): Promise<string | null> {
  const client = await clerkClient();
  const { data: invitations } = await client.invitations.getInvitationList({
    status: "pending",
    limit: 100,
  });

  const match = invitations.find((invitation) => {
    if (!invitation.url) return false;
    try {
      const url = new URL(invitation.url);
      return url.searchParams.get("ticket") === ticket;
    } catch {
      return invitation.url.includes(ticket);
    }
  });

  if (!match) return null;

  const isAdmin = match.publicMetadata?.role === "admin";
  return buildRedirect(origin, defaultSignUpPath(isAdmin), ticket);
}

/**
 * Resolve the redirect target for a Clerk invitation ticket.
 * Called from the local `tickets/accept` route handler (Node runtime).
 */
export async function resolveClerkTicketAcceptRedirect(
  request: NextRequest,
  ticket: string,
): Promise<string> {
  const origin = request.nextUrl.origin;

  const fromPayload = resolveClerkTicketAcceptRedirectFromPayload(origin, ticket);
  if (fromPayload) return fromPayload;

  const fromInvitation = await resolveRedirectUrlFromInvitation(ticket, origin);
  if (fromInvitation) return fromInvitation;

  return buildRedirect(origin, "/sign-up", ticket);
}
