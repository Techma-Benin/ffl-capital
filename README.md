# FFL Capital — Lead Distribution Platform

Plateforme propriétaire de distribution de leads IUL pour FFL Capital (Integrity Marketing). Remplace Boberdoo avec marketplace aged leads en self-service.

## Documentation

- [PRD](docs/PRD.md) — spécification produit complète
- [PROJECT](docs/PROJECT.md) — mémoire projet et décisions
- [BACKEND](docs/BACKEND.md) — architecture backend et journal d'implémentation
- [PARTNER_CRM_OUTBOUND](docs/PARTNER_CRM_OUTBOUND.md) — livraison CRM POST self-service partner
- [LEADCONDUIT_SETUP](docs/LEADCONDUIT_SETUP.md) — connexion LeadConduit / ngrok / cutover prod
- [CLERK_INTEGRATION](docs/CLERK_INTEGRATION.md) — Clerk proxy Replit, invitations admin
- [CORE_BACKEND_PLAN](docs/CORE_BACKEND_PLAN.md) — plan backend core (✅ complété)
- [Boberdoo exploration](docs/BOBERDOO_EXPLORATION.md) — parité fonctionnelle
- [Client lead routing spec](docs/client_email_lead_routing_2026-08-03.txt) — lifecycle approuvé (août 2026)
- [Gap analysis](docs/BOBERDOO_GAP_ANALYSIS.md) — inventaire vs Boberdoo (mis à jour juil. 2026)

## Stack

- **pnpm** — gestionnaire de paquets (lockfile local, voir `.gitignore`)
- **Next.js 14** (App Router) + TypeScript
- **Prisma** + PostgreSQL (Supabase dev → Replit prod)
- **Clerk** auth (admin + partner)
- **Stripe** wallet (test keys; prod après validation)

## Setup rapide

### Replit

1. Activer le module **PostgreSQL** dans le Repl — Replit injecte **`DATABASE_URL`** (vérifier dans Secrets / Database).
2. Après chaque pull : `bash scripts/post-merge.sh` (ou laisser le hook post-merge le faire) — installe, migre, et lance `pnpm run ensure:integrity-env`.
3. Première fois sur une base vide : `pnpm run seed`.
4. Lancer : **Run** (`pnpm dev -- -p 5000`) ou `pnpm dev -- -p 5000`.

Pas besoin de **`DIRECT_URL`** (Supabase seulement) ; Prisma utilise uniquement **`DATABASE_URL`**.

**Integrity env (Replit / après pull)** : `pnpm run ensure:integrity-env` remplit les URLs submit manquantes dans `.env` sans écraser les valeurs existantes. Les **Replit Secrets** déjà définis gagnent au runtime.

### Local / Supabase

```bash
# 1. Cloner et installer
git clone <repo-url>
cd ffl-capital
pnpm install

# 2. Configurer la base de données
cp .env.example .env
# Remplir DATABASE_URL (Replit Postgres le fournit), CLERK_*, STRIPE_*, RESEND_*, NEXT_PUBLIC_APP_URL selon besoin
# (RESEND_API_KEY + FROM_EMAIL : emails livraison + Partner Contact Us ; destinataire Contact Us dans Admin Settings)
# (NEXT_PUBLIC_APP_URL : domaine public pour liens email / invite Clerk / retours Stripe — pas localhost en prod Replit)
pnpm run ensure:integrity-env   # defaults Integrity manquants (idempotent)

# 3. Migrations et seed
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm run db:sync-integrity-labels
pnpm run seed

# 4. Lancer le serveur dev
pnpm dev
```

## Vérification

```bash
# Santé API + connexion DB
curl http://localhost:3000/api/health

# Tests logique matching (sans DB)
pnpm run test:matching

# Tests CRM outbound (SSRF, mapping, success rules — sans DB)
pnpm run test:outbound

# Tests logique catégories lead + intake (sans DB)
pnpm test:backend:current
pnpm test:backend:planned
pnpm test:backend

# Checklist backend E2E (dev server must be running; Replit Run → port 5000)
API_BASE_URL=http://127.0.0.1:5000 pnpm run verify   # Replit
pnpm run verify                                      # local default http://127.0.0.1:3000

# Simuler un lead (serveur dev requis)
pnpm run seed:lead

# Données demo remboursements admin (/admin/refunds)
pnpm run seed:refunds-demo

# Leads vieillis pour /admin/aged et /partner/aged
pnpm run seed:aged-leads

# Réévaluer la classification catégorie sur l'historique (dry-run ; --apply pour écrire)
pnpm run repair:category-classification

# Désigner le premier super admin (one-off, requiert un admin existant)
pnpm run make-super-admin -- --email admin@example.com
```

## Endpoints API (principaux)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/health` | Statut serveur + connexion DB |
| POST | `/api/leads/intake` | Webhook LeadConduit (format Boberdoo, public, CORS) |
| POST | `/api/wallet/checkout` | Stripe top-up (partner auth) |
| GET/POST/DELETE | `/api/wallet/subscribe` | Auto-recharge hebdo Stripe (partner auth) |
| POST | `/api/webhooks/stripe` | Webhook Stripe (signé) — top-up + abo |
| POST | `/api/refunds` | Demande remboursement partner |
| POST | `/api/partner/contact` | Contact Us partner (Resend → admin + confirmation) |
| POST | `/api/cron/reprocess-unmatched` | Retraitement leads (Bearer CRON_SECRET) |
| POST | `/api/cron/integrity-post` | Post Integrity unmatched (Bearer CRON_SECRET) |
| POST | `/api/admin/lead-routing/preview` | Preview lifecycle routing policy (admin auth) |

Admin APIs : leads search/export/reprocess, **assign-category** (review), **lead-categories** CRUD, **lead-views** CRUD, **lead-routing preview**, partners, filter sets, refunds, **integrity postings** (list + detail payloads + reprocess) — voir [BACKEND.md](docs/BACKEND.md).

**Stripe webhook (prod) :** après deploy, `prisma migrate deploy` (ou `bash scripts/post-merge.sh`). Dashboard → endpoint `https://ffl-capital.replit.app/api/webhooks/stripe` avec `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`. `STRIPE_WEBHOOK_SECRET` doit matcher ce endpoint (pas une ancienne URL Replit).

## Dev tools

| URL | Description |
|-----|-------------|
| `/dev/lead-simulator` | Formulaire test → POST intake (dev only) |
| `/feeding-platform` | UI statique soumissions test |

Pour recevoir de **vrais** leads LeadConduit en local : ngrok + [LEADCONDUIT_SETUP.md](docs/LEADCONDUIT_SETUP.md).

## Portails

| Portail | Routes |
|---------|--------|
| Admin | `/admin` — dashboard, leads, partners, refunds, aged, integrity, settings (lead categories, integrations, contact recipient), migration (CSV sélection/glisser-déposer, auto-détection catalogue, Map Columns avec mappings préremplis pour tous les CSV, preview, résultats), filter list ; auth `/admin/sign-in`, invite-only `/admin/sign-up` |
| Partner | `/partner` — dashboard, leads, wallet, aged, settings, contact (Resend) ; auth `/sign-in`, `/sign-up` |

## Structure

```
prisma/           # Schéma + migrations
src/app/api/      # Routes API
src/lib/          # Logique métier (matching, intake, wallet, delivery, lead-routing, integrity)
scripts/          # Seed et tests
fixtures/         # Payloads exemple Boberdoo
docs/             # Documentation projet
```

## Note Supabase

Projet **FFL Capital** : ref `wbzvyvtlopoghvdqltxm`, région `eu-west-3`.  
Dashboard : https://supabase.com/dashboard/project/wbzvyvtlopoghvdqltxm

Copier `.env.example` → `.env`, remplacer `[YOUR-PASSWORD]` par le mot de passe DB (Project Settings → Database).
