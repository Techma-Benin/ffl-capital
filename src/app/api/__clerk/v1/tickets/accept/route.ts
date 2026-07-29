import { NextRequest, NextResponse } from "next/server";
import { resolveClerkTicketAcceptRedirect } from "@/lib/auth/clerk-ticket-accept-server";

/**
 * Local stand-in for Clerk Frontend API `GET /v1/tickets/accept`.
 *
 * In production the Clerk proxy (see middleware) would forward this to Clerk,
 * but that path is Cloudflare-protected and returns an unusable challenge page.
 * Clerk's endpoint only redirects anyway — we emit the same redirect locally.
 */
export async function GET(request: NextRequest) {
  const ticket = request.nextUrl.searchParams.get("ticket");
  if (!ticket) {
    return NextResponse.json({ error: "Missing ticket" }, { status: 400 });
  }

  const location = await resolveClerkTicketAcceptRedirect(request, ticket);
  return NextResponse.redirect(location, 302);
}
