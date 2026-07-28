---
name: Replit-managed Clerk must not be hand-configured
description: Why custom Clerk FAPI proxies, CDN JS pins, or manual proxyUrl wiring break Replit's managed Clerk integration in production.
---

Replit's managed Clerk Auth feature automatically provisions dev/prod Clerk
instances, injects the right keys, and configures `ClerkProvider`, middleware,
and custom-domain proxying itself — including for published apps on custom
domains (as long as the domain is linked in the Publishing tool). Per Replit's
own docs (`docs.replit.com/features/auth-and-identity/clerk-auth`): you should
**not** manually configure these components or edit Clerk dashboard settings,
because it can break the automatic dev/prod environment switching.

**Why:** A prior session on the FFL Capital project saw the Clerk Frontend API
custom subdomain (`clerk.<app>.replit.app`) returning intermittent 502s in
production and "fixed" it by hand-rolling a server-side proxy route
(`/api/clerk/[[...path]]`), a manual `proxyUrl` on `ClerkProvider` derived from
the request host, and a `NEXT_PUBLIC_CLERK_JS_URL` override pinning the Clerk
JS SDK to a specific CDN version. This was all unnecessary and actively harmful
— it fought the platform's own automatic proxy/env switching, produced
inconsistent Clerk JS/API versions between environments, and the FAPI 502s
turned out to be transient upstream issues, not something app code should work
around.

**How to apply:** If Clerk sign-in fails in production on a Replit-managed
Clerk app, do not add custom proxy/SSL-bypass/CDN-pin code. Use plain
`<ClerkProvider appearance={...}>` with no `proxyUrl`, no custom
`/api/clerk/*` route, and no `NEXT_PUBLIC_CLERK_JS_URL` override. If the FAPI
subdomain is erroring, that's a platform-side issue — investigate via
`searchReplitDocs`/support rather than hand-patching around it in app code.
