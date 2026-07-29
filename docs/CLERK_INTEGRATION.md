# Clerk — Auth, proxy Replit & invitations admin

> Dernière mise à jour : 29 juillet 2026

Guide d'intégration Clerk pour FFL Capital : déploiement sur domaine Replit (sans CNAME Clerk), acceptation des tickets d'invitation, et flux admin invite-only.

**Voir aussi :** [BACKEND.md § Auth admin](BACKEND.md#auth-admin)

---

## Contexte Replit — pourquoi un proxy Clerk

En production, Clerk recommande un sous-domaine dédié (`clerk.tondomaine.com` → CNAME). Sur **`*.replit.app`**, Replit contrôle le DNS : pas de CNAME possible.

**Solution Clerk :** proxifier la Frontend API via un chemin sur le domaine de l'app (`/api/__clerk`). Activé en **production uniquement** via `clerkMiddleware` (`src/middleware.ts`, option `frontendApiProxy`).

| Environnement | Proxy FAPI |
|---------------|------------|
| Dev local | Désactivé (`NODE_ENV !== "production"`) |
| Replit prod | Activé — trafic `/api/__clerk/*` → Clerk |

---

## Bug corrigé — page blanche sur les liens d'invitation

### Symptôme

Un invité clique le lien email Clerk → page blanche au lieu d'arriver sur la page d'inscription.

### Cause

`GET /api/__clerk/v1/tickets/accept` était proxifié vers `frontend-api.clerk.dev`, protégé par **Cloudflare** (challenge anti-bot). Sur le domaine Replit :

1. Le JS du challenge ne se charge pas (chemins `/cdn-cgi/*` absents côté app).
2. Les cookies Cloudflare ne s'appliquent pas au domaine Replit.

Résultat : 403 + corps inutilisable → page blanche. Le bug paraissait intermittent (navigateur déjà « chaud » sur l'origine).

### Correctif

L'endpoint `tickets/accept` ne fait **qu'une redirection 302** (doc Clerk). On le gère **localement** au lieu de le proxifier :

| Composant | Rôle |
|-----------|------|
| `src/app/api/__clerk/v1/tickets/accept/route.ts` | Handler `GET` — redirige vers sign-up avec `__clerk_ticket` |
| `src/lib/auth/clerk-ticket-accept.ts` | Logique edge-safe (JWT payload, skip proxy) |
| `src/lib/auth/clerk-ticket-accept-server.ts` | Fallback Node : lookup invitation Clerk si JWT incomplet |
| `src/middleware.ts` | `frontendApiProxy.enabled` = `shouldProxyClerkFrontendApi` (skip pour `tickets/accept`) ; route publique |

**Sécurité :** le ticket est un JWT signé ; `accept` ne validait rien côté Clerk non plus. La validation se fait quand `<SignUp/>` appelle `signUp.create({ strategy: "ticket", ticket })`.

| Requête | Comportement |
|---------|--------------|
| `GET /api/__clerk/v1/tickets/accept?ticket=…` | 302 local → `/admin/sign-up?__clerk_ticket=…` ou `/sign-up?…` |
| Autres `GET/POST /api/__clerk/*` | Proxifiés (inchangé) |

**Ne pas réintroduire :** proxifier à nouveau `tickets/accept` ; oublier `redirectUrl` sur `createInvitation`.

---

## Portails auth — routes publiques

| Portail | Sign-in | Sign-up | Notes |
|---------|---------|---------|-------|
| Partner | `/sign-in` | `/sign-up` | Inscription publique + onboarding |
| Admin | `/admin/sign-in` | `/admin/sign-up` | **Invite-only** — pas de lien UI vers sign-up |

Routes auth listées comme publiques dans `src/middleware.ts` (dont `CLERK_TICKET_ACCEPT_PATH`).

---

## Invitations admin

Les comptes admin ne sont **pas** self-serve. Un super-admin envoie une invitation :

| Item | Valeur |
|------|--------|
| API | `POST /api/admin/administrators/invite` |
| Body | `{ "email": "…" }` |
| Auth | Session admin requise |
| Clerk | `createInvitation({ redirectUrl: \`${origin}/admin/sign-up\`, publicMetadata: { role: "admin" } })` |

`redirectUrl` est dérivé de **`request.nextUrl.origin`** (pas `NEXT_PUBLIC_APP_URL`) pour éviter un décalage avec le domaine Replit publié.

### Flux invité

```
Email invitation
  → GET /api/__clerk/v1/tickets/accept?ticket=…   (handler local)
  → 302 /admin/sign-up?__clerk_ticket=…
  → <SignUp path="/admin/sign-up" signInUrl="/admin/sign-in" />
  → création mot de passe → /auth/continue (admin)
```

Page : `src/app/admin/(auth)/sign-up/[[...sign-up]]/page.tsx` — `<SignUp routing="path" …>` requis pour le flux ticket (pas `<SignIn>`).

---

## Variables d'environnement

| Variable | Usage |
|----------|-------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_PUBLISHABLE_KEY` | Clés publiques Clerk |
| `CLERK_SECRET_KEY` | Backend (invitations, promote-admin) |
| `ADMIN_EMAILS` | Allowlist promotion admin au login — voir BACKEND |

---

## Vérification après déploiement

1. Inviter un admin depuis l'UI (ou `POST /api/admin/administrators/invite`).
2. Ouvrir le lien d'invitation dans un **navigateur qui n'a jamais visité** l'URL Replit (évite les faux positifs Cloudflare).
3. Confirmer : redirection → formulaire « Create your admin account » → mot de passe → accès admin.

`pnpm run typecheck` — pas de régression types.

---

## Pièges connus

| Piège | Conséquence |
|-------|-------------|
| `redirectUrl` pointe vers `/admin/sign-in` ou une route sans `<SignUp>` | Invité voit connexion, pas création de compte |
| Route sign-up absente des routes publiques middleware | Bounce vers sign-in, ticket perdu |
| Tester avec un navigateur déjà connecté à l'app | Faux positif — le bug original semble « réparé » |
| Remettre le proxy sur `tickets/accept` | Page blanche revient en prod Replit |
