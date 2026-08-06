---
name: Clerk key mapping for Next.js
description: Replit-managed Clerk sets CLERK_PUBLISHABLE_KEY but Next.js apps need NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.
---

Replit's `setupClerkWhitelabelAuth()` sets these secrets:
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `VITE_CLERK_PUBLISHABLE_KEY`

Next.js apps using `@clerk/nextjs` check for `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (client bundle prefix). Fix this in `next.config.mjs` without duplicating secrets:

```js
env: {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    process.env.CLERK_PUBLISHABLE_KEY ||
    "",
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/sign-in",
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: "/sign-up",
  NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: "/auth/continue?portal=partner",
  NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: "/auth/continue?portal=partner",
},
```

**Why:** The `NEXT_PUBLIC_` prefix is required for Next.js to embed the value in the client bundle. Without it, `isClerkConfigured()` returns false, middleware is disabled, and `ClerkProvider` doesn't mount.

**How to apply:** Any time a Next.js app uses Replit-managed Clerk and Clerk appears disabled (no auth, middleware passthrough), check the key name mismatch first.
