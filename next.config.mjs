/** @type {import('next').NextConfig} */
const isProdBuild = process.env.NODE_ENV === "production";

const nextConfig = {
  reactStrictMode: false,

  // Expose Replit-managed secrets under the names Next.js and Clerk expect.
  // CLERK_PUBLISHABLE_KEY is set by Replit's managed Clerk integration;
  // the NEXT_PUBLIC_ prefix makes it available to the client bundle.
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      process.env.CLERK_PUBLISHABLE_KEY ||
      "",
    // App URL — used as a fallback origin in a few server-side routes.
    // NOTE: this is a Replit secret and is NOT guaranteed to track the
    // published domain (it can drift, e.g. still hold a dev *.replit.dev
    // value after publishing). Never use it for anything baked into the
    // client bundle — see NEXT_PUBLIC_CLERK_PROXY_URL below for why.
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "",
    // Clerk's production instance is configured to proxy its Frontend API
    // through our own domain at /api/__clerk (handled entirely inside
    // src/middleware.ts's frontendApiProxy option — no separate route file)
    // instead of Clerk's CNAME subdomain. Proxying is not supported for
    // Clerk development instances, so this is production-only; ClerkProvider
    // talks to the Frontend API directly in dev.
    //
    // Deliberately a RELATIVE path, not an absolute URL built from
    // NEXT_PUBLIC_APP_URL: NEXT_PUBLIC_* values are inlined into the client
    // bundle at *build* time, so any absolute URL baked in here is wrong
    // forever (for every origin except the one true at build time) the
    // moment the app is reachable at more than one hostname, or if the app
    // URL secret drifts. Clerk's own proxy.js resolves a relative proxyUrl
    // against `window.location.origin` at runtime instead, which is exactly
    // what we want — see @clerk/shared's proxyUrlToAbsoluteURL.
    NEXT_PUBLIC_CLERK_PROXY_URL: isProdBuild ? "/api/__clerk" : "",
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/sign-in",
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: "/sign-up",
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL:
      "/auth/continue?portal=partner",
    NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL:
      "/auth/continue?portal=partner",
  },

  async redirects() {
    return [
      {
        source: "/feeding-platform",
        destination: "/feeding-platform/index.html",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
