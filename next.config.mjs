/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable the instrumentation hook (src/instrumentation.ts) for in-process cron jobs
  experimental: { instrumentationHook: true },
  reactStrictMode: false,

  // Expose Replit-managed secrets under the names Next.js and Clerk expect.
  // CLERK_PUBLISHABLE_KEY is set by Replit's managed Clerk integration;
  // the NEXT_PUBLIC_ prefix makes it available to the client bundle.
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      process.env.CLERK_PUBLISHABLE_KEY ||
      "",
    // App URL — used to construct the Clerk proxy URL on the client side.
    // In production this is the published domain (set as a Replit secret).
    // Leave empty in dev so ClerkProvider skips the proxy and uses the FAPI directly.
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "",
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
