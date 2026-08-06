import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/api/health(.*)",
  "/api/leads/intake(.*)",
  "/api/webhooks/stripe(.*)",
  "/api/cron(.*)",
  "/dev(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/admin/sign-in(.*)",
  "/admin/access-denied",
  "/auth/continue",
]);

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const protectedMiddleware = clerkMiddleware(async (auth, request) => {
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
});

export default clerkEnabled
  ? protectedMiddleware
  : () => NextResponse.next();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
