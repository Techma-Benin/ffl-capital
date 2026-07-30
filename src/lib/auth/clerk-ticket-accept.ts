import { NextResponse, type NextRequest } from "next/server";

/** Clerk FAPI path proxied at `/api/__clerk` in production. */
export const CLERK_TICKET_ACCEPT_PATH = "/api/__clerk/v1/tickets/accept";

export function isClerkTicketAcceptRequest(request: NextRequest): boolean {
  return (
    request.method === "GET" &&
    request.nextUrl.pathname === CLERK_TICKET_ACCEPT_PATH
  );
}

/**
 * Whether incoming Frontend-API requests should be proxied to Clerk.
 * Ticket acceptance is handled locally in middleware — App Router cannot
 * route folders starting with `_` (see `handleClerkTicketAccept`).
 */
export function shouldProxyClerkFrontendApi(url: URL): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  if (url.pathname === CLERK_TICKET_ACCEPT_PATH) return false;
  return true;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readRedirectUrlFromPayload(payload: Record<string, unknown>): string | null {
  for (const key of ["rurl", "ru", "redirect_url", "redirectUrl"]) {
    const value = payload[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

function readAdminRoleFromPayload(payload: Record<string, unknown>): boolean {
  const candidates = [
    payload.public_metadata,
    payload.publicMetadata,
    payload.pmd,
    payload.metadata,
  ];
  for (const meta of candidates) {
    if (meta && typeof meta === "object" && !Array.isArray(meta)) {
      if ((meta as Record<string, unknown>).role === "admin") return true;
    }
  }
  return false;
}

function defaultSignUpPath(isAdmin: boolean): string {
  return isAdmin ? "/admin/sign-up" : "/sign-up";
}

function buildRedirect(origin: string, pathOrUrl: string, ticket: string): string {
  let target: URL;
  if (pathOrUrl.startsWith("http")) {
    const embedded = new URL(pathOrUrl);
    // redirectUrl is set at invite time (may be localhost while the link is
    // opened on Replit). Always land on the host that received the click.
    target = new URL(`${embedded.pathname}${embedded.search}`, origin);
  } else {
    target = new URL(pathOrUrl, origin);
  }
  target.searchParams.set("__clerk_ticket", ticket);
  return target.toString();
}

/**
 * Handle `GET /api/__clerk/v1/tickets/accept` in middleware.
 * Cannot use an App Router route file — `__clerk` starts with `_` (private folder → 404).
 */
export function handleClerkTicketAccept(request: NextRequest): NextResponse | null {
  if (!isClerkTicketAcceptRequest(request)) return null;

  const ticket = request.nextUrl.searchParams.get("ticket");
  if (!ticket) {
    return NextResponse.json({ error: "Missing ticket" }, { status: 400 });
  }

  const location =
    resolveClerkTicketAcceptRedirectFromPayload(request.nextUrl.origin, ticket) ??
    buildRedirect(request.nextUrl.origin, "/sign-up", ticket);

  return NextResponse.redirect(location, 302);
}

/**
 * Resolve where `GET /v1/tickets/accept` should redirect.
 * Edge-safe (no Clerk backend calls) — used when JWT carries enough data.
 */
export function resolveClerkTicketAcceptRedirectFromPayload(
  origin: string,
  ticket: string,
): string | null {
  const payload = decodeJwtPayload(ticket);
  if (!payload) return null;

  const embedded = readRedirectUrlFromPayload(payload);
  if (embedded) return buildRedirect(origin, embedded, ticket);

  const isAdmin = readAdminRoleFromPayload(payload);
  return buildRedirect(origin, defaultSignUpPath(isAdmin), ticket);
}

export { decodeJwtPayload, readAdminRoleFromPayload, buildRedirect, defaultSignUpPath };
