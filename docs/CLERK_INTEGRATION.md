# Clerk — Auth, proxy Replit & invitations admin

> Dernière mise à jour : 3 août 2026

Guide d'intégration Clerk pour FFL Capital : déploiement sur domaine Replit (sans CNAME Clerk), acceptation des tickets d'invitation, et flux admin invite-only (recovery conflits + orphans accepted).

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
| `src/lib/auth/clerk-ticket-accept.ts` | Handler `GET` en middleware — redirige vers sign-up avec `__clerk_ticket` (pas de route App Router : dossier `__clerk` privé) |
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
| Liste | `GET /api/admin/administrators` — users admin + invitations admin (tous statuts) ; **dedupe** : invitation `accepted` masquée si un admin actif existe déjà pour le même email (case-insensitive) ; pending + orphans accepted restent visibles ; révocation UI des stale non-accepted |

`redirectUrl` passe par **`resolveAppOrigin`** (`src/lib/email/email-layout.ts`) : priorité à `NEXT_PUBLIC_APP_URL` non-loopback, puis `REPLIT_DOMAINS`, puis l’origine requête si elle n’est pas loopback (`localhost` / `127.0.0.1` / `*.localhost`), sinon fallback local-dev `http://localhost:3000`. Sur Replit, l’Host interne `localhost:5000` est donc ignoré pour ne pas figer les liens d’invitation sur le port interne.

### Récupération sur conflit Clerk

Si `createInvitation` renvoie `form_identifier_exists` / `duplicate_record` :

| Cas | Comportement |
|-----|--------------|
| User live non-admin (ex. partner) | Promotion `publicMetadata.role = "admin"` ; `{ promoted: true }` (200) — toast UI « promoted » |
| Déjà admin | 409 |
| Pas de user, invitations stale (accepted/expired/…) | Revoke puis un retry `createInvitation` |
| Autre | 409 avec message de récupération |

Logs : préfixe `[admin/administrators/invite]` (conflits, users/invitations matchés, codes Clerk).

### Récupération orphan — invitation `accepted` sans user

Cas : l’invité a accepté (statut Clerk `accepted`) mais aucun user Clerk n’existe pour cet email → impossible de se connecter, et Clerk **ne peut pas révoquer** une invitation déjà accepted.

| Item | Valeur |
|------|--------|
| API | `POST /api/admin/administrators/invitations/[id]/create-user` |
| Auth | `requireAdmin` |
| Prérequis | Invitation trouvée, `status === "accepted"`, `publicMetadata.role === "admin"`, aucun user pour cet email |
| Clerk | `createUser` avec `publicMetadata: { role: "admin" }` — préfère `skipPasswordRequirement: true` (SSO Google / email sans mot de passe forcé) ; si échec → mot de passe aléatoire + `skipPasswordChecks` |
| UI | Settings → Administrators : pour les lignes `accepted`, bouton **Create account** (confirm) à la place de revoke/delete ; refresh après succès |
| Réponse | `{ ok: true, userId }` (201) |

Logs : préfixe `[admin/administrators/invitations/create-user]`.

Si un user non-admin existe déjà pour l’email → 409 (utiliser Invite admin pour promouvoir).

### Flux invité

```
Email invitation
  → GET /api/__clerk/v1/tickets/accept?ticket=…   (handler local)
  → 302 /admin/sign-up?__clerk_ticket=…
  → <SignUp path="/admin/sign-up" signInUrl="/admin/sign-in" />
  → création mot de passe → /auth/continue (admin)
```

Page : `src/app/admin/(auth)/sign-up/[[...sign-up]]/page.tsx` — `<SignUp routing="path" …>` requis pour le flux ticket (pas `<SignIn>`).

**Note :** un partenaire promu via invite utilise le même compte Clerk avec `role=admin` ; les portails restent séparés (`/admin` vs partner).

---

## Variables d'environnement

| Variable | Usage |
|----------|-------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_PUBLISHABLE_KEY` | Clés publiques Clerk |
| `CLERK_SECRET_KEY` | Backend (invitations, promote-admin, create-user orphan) |
| `ADMIN_EMAILS` | Allowlist promotion admin au login — voir BACKEND |
| `NEXT_PUBLIC_APP_URL` | Origine publique pour `redirectUrl` d’invitation (et autres CTAs absolus) ; doit être le domaine publié, pas `localhost` |
| `REPLIT_DOMAINS` | Fallback Replit si `NEXT_PUBLIC_APP_URL` est absent ou loopback |

---

## Vérification après déploiement

1. Inviter un admin depuis l'UI (ou `POST /api/admin/administrators/invite`).
2. Ouvrir le lien d'invitation dans un **navigateur qui n'a jamais visité** l'URL Replit (évite les faux positifs Cloudflare).
3. Confirmer : redirection → formulaire « Create your admin account » → mot de passe → accès admin.
4. (Orphan) Si une ligne invitation reste `accepted` sans user actif : **Create account** → l’email peut se connecter sur `/admin` ; la ligne invitation disparaît via dedupe une fois l’admin créé.

`pnpm run typecheck` — pas de régression types.

---

## Pièges connus

| Piège | Conséquence |
|-------|-------------|
| `redirectUrl` pointe vers `/admin/sign-in` ou une route sans `<SignUp>` | Invité voit connexion, pas création de compte |
| `NEXT_PUBLIC_APP_URL` loopback / absent et Host Replit = loopback (`localhost:5000`) sans `REPLIT_DOMAINS` | Liens d’invitation inutilisables hors machine (mitigé par `resolveAppOrigin` + `REPLIT_DOMAINS`) |
| Route sign-up absente des routes publiques middleware | Bounce vers sign-in, ticket perdu |
| Tester avec un navigateur déjà connecté à l'app | Faux positif — le bug original semble « réparé » |
| Remettre le proxy sur `tickets/accept` | Page blanche revient en prod Replit |
| Tenter de révoquer une invitation `accepted` | Clerk refuse — utiliser **Create account** (orphan) ou laisser le dedupe si un admin existe déjà |
