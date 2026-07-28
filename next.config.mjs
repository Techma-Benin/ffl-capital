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
    // App URL — used to construct the Clerk Frontend API proxy URL below.
    // In production this is the published domain (set as a Replit secret).
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "",
    // Clerk's production instance is configured to proxy its Frontend API
    // through our own domain at /api/__clerk (handled entirely inside
    // src/middleware.ts's frontendApiProxy option — no separate route file)
    // instead of Clerk's CNAME subdomain. Proxying is not supported for
    // Clerk development instances, so this is production-only; ClerkProvider
    // talks to the Frontend API directly in dev.
    NEXT_PUBLIC_CLERK_PROXY_URL:
      isProdBuild && process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/__clerk`
        : "",
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
