import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import {
  CLERK_TICKET_ACCEPT_PATH,
  handleClerkTicketAccept,
  shouldProxyClerkFrontendApi,
} from "@/lib/auth/clerk-ticket-accept";

const isPublicRoute = createRouteMatcher([
  "/",
  "/api/health(.*)",
  "/api/leads/intake(.*)",
  "/api/webhooks/stripe(.*)",
  "/api/cron(.*)",
  "/api/admin/setup(.*)",
  CLERK_TICKET_ACCEPT_PATH,
  "/dev(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/admin/sign-in(.*)",
  "/admin/sign-up(.*)",
  "/admin/access-denied",
  "/auth/continue",
]);

const clerkEnabled = !!(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.CLERK_PUBLISHABLE_KEY
);

const protectedMiddleware = clerkMiddleware(
  async (auth, request) => {
    if (!isPublicRoute(request)) {
      const { userId, redirectToSignIn } = await auth();
      if (!userId) {
        const { pathname } = request.nextUrl;
        if (pathname.startsWith("/admin")) {
          const url = request.nextUrl.clone();
          url.pathname = "/admin/sign-in";
          url.searchParams.set(
            "redirect_url",
            `${pathname}${request.nextUrl.search}`,
          );
          return NextResponse.redirect(url);
        }
        return redirectToSignIn();
      }
    }
  },
  {
    // Clerk's production instance proxies its Frontend API through our own
    // domain (see src/app/api/__clerk) instead of a Clerk CNAME subdomain.
    // Proxying isn't supported for dev instances, so this stays off in dev.
    frontendApiProxy: {
      // Skip proxying ticket acceptance — handled in middleware so Cloudflare
      // never blocks invite links (see handleClerkTicketAccept).
      enabled: shouldProxyClerkFrontendApi,
      path: "/api/__clerk",
    },
  },
);

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  const ticketResponse = handleClerkTicketAccept(request);
  if (ticketResponse) return ticketResponse;

  if (clerkEnabled) {
    return protectedMiddleware(request, event);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/api/__clerk/(.*)",
  ],
};
