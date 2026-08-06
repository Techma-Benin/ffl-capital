---
name: Clerk invitation acceptance needs a SignUp page, not SignIn
description: Invitation emails carry a Clerk ticket meant for the SignUp component; pointing the invitation redirectUrl at a SignIn-only route sends new invitees to a plain sign-in screen instead of the create-account form.
---

When creating a Clerk invitation (`client.invitations.createInvitation({ redirectUrl, ... })`), the `redirectUrl` must resolve to a route that renders Clerk's `<SignUp>` component. If that route only renders `<SignIn>` (or doesn't exist and middleware bounces to a sign-in page), the invitee sees a normal sign-in form — no password-creation step — because `<SignIn>` doesn't handle the invitation ticket flow.

**Why:** discovered when an admin-invite flow pointed `redirectUrl` at `/admin/sign-in`, which had no counterpart `/admin/sign-up` route at all; invitees were redirected straight to sign-in with no way to accept.

**How to apply:** whenever adding or auditing an invitation flow (any portal, not just admin), confirm (1) a `<SignUp>`-rendering page exists at the exact `redirectUrl` path, and (2) that path is listed as a public route in middleware so the ticket in the query string reaches the page unauthenticated.
