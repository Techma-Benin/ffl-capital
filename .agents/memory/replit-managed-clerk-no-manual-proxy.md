---
name: Replit-managed Clerk — when the CNAME subdomain is actually broken
description: What to do when a Replit-managed Clerk app's CNAME Frontend API subdomain (clerk.<app>.replit.app) returns persistent 502s in production.
---

Replit's managed Clerk Auth feature normally provisions dev/prod Clerk
instances, injects keys, and wires up `ClerkProvider`/middleware/custom-domain
proxying automatically. Do not hand-roll a Clerk FAPI proxy, pin the Clerk JS
CDN version, or manually derive a `proxyUrl` from the request host as a first
response to sign-in problems — those are almost always symptoms of something
else (env var mismatch, stale keys, transient upstream blip).

**However:** on the FFL Capital project, the CNAME Frontend API subdomain
(`clerk.ffl-capital.replit.app`) was confirmed — across multiple sessions, via
direct curl from outside the app — to return **persistent** 502s at the
infrastructure level, unrelated to app code. A sibling app on the same
platform using Clerk's **Proxy** connection method (Frontend API reachable at
`/api/__clerk` on its own domain, no separate subdomain/cert) had no such
issue. This indicated a platform-level problem specific to that CNAME
subdomain, not a transient blip and not an app-code bug.

**Why proxy over CNAME fixed it:** the Proxy method removes the extra
subdomain/cert entirely — Clerk's Frontend API is reached through a path on
the app's own already-working domain, so there's nothing separate to 502.

**How to apply — the supported way to switch a Replit-managed Clerk app from
CNAME to Proxy:**
1. Requires `@clerk/nextjs` v7+, which requires Next.js `^15.2.8` (or 16). If
   still on Next 14, this forces a Next.js 14→15 upgrade first — stay on React
   18 (both Next 15 and Clerk v7 support it as a peer) to avoid stacking a
   React 19 migration on top.
2. In `src/middleware.ts`, pass a second options argument to
   `clerkMiddleware()`: `{ frontendApiProxy: { enabled: <prod only>, path:
   "/api/__clerk" } }`. No separate route handler file is needed — the
   middleware handles proxying internally. Add the proxy path to the
   exported `config.matcher`.
3. Set `NEXT_PUBLIC_CLERK_PROXY_URL` (client-side) to
   `${productionAppUrl}/api/__clerk` in production only (proxying isn't
   supported for Clerk dev instances) — e.g. via `next.config.mjs`'s `env`
   block. The middleware option auto-derives the server-side proxy handshake
   URL; no `proxyUrl` prop needed on `<ClerkProvider>`.
4. Clerk also requires the domain's `proxy_url` to be set account-side before
   it will accept proxied requests — this is not controlled by app code or by
   Replit's key injection. Do it via the Backend API, not the Dashboard, to
   keep it scriptable: `client.domains.list()` to find the primary domain,
   then `client.domains.update({ domainId, proxy_url })` (wraps `PATCH
   /v1/domains/{domain_id}`, in `@clerk/backend`'s `DomainAPI` — check
   `node_modules/@clerk/backend/dist/api/endpoints/DomainApi.d.ts` for the
   current shape rather than trusting scraped docs, which render incompletely
   for this "advanced/unsupported" feature). This is a one-time,
   idempotent, per-environment action — safest done via a guarded internal
   API route (reuse the app's existing cron-secret bearer-auth pattern) hit
   once after deploying the proxy code, rather than a throwaway script, since
   only the deployed runtime has the production `CLERK_SECRET_KEY`.
5. Clerk v6/v7 also removed the old `afterSignInUrl`/`afterSignUpUrl` props
   on `<SignIn>`/`<SignUp>` in favor of `forceRedirectUrl` (always redirects
   there, matching the old prop's behavior) and `fallbackRedirectUrl` (only
   when no `redirect_url` in the query). `afterSignOutUrl` on `<UserButton>`
   was removed too — its default is already `/`, so most usages can just be
   deleted.

**Still unresolved as of this writing:** production had not yet been
re-verified after this change (needs a real publish + the one-time Backend
API call above + a curl/browser check of `/api/__clerk/...` on the live
domain). If a later session finds this fixed it, remove this caveat. If a
later session finds a *different* root cause, replace this file's guidance
accordingly rather than layering on more workarounds.
