# FFL Capital — Lead Distribution Platform

Plateforme propriétaire de distribution de leads IUL pour FFL Capital (Integrity Marketing). Remplace Boberdoo avec marketplace aged leads en self-service.

## Documentation

- [PRD](docs/PRD.md) — spécification produit complète
- [PROJECT](docs/PROJECT.md) — mémoire projet et décisions
- [BACKEND](docs/BACKEND.md) — architecture backend et journal d'implémentation
- [CORE_BACKEND_PLAN](docs/CORE_BACKEND_PLAN.md) — plan de complétion backend core (en cours)
- [Boberdoo exploration](docs/BOBERDOO_EXPLORATION.md) — parité fonctionnelle

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Prisma** + PostgreSQL (Supabase dev → Replit prod)
- **Clerk** auth (Phase 1b)
- **Stripe** wallet (Phase 2)

## Setup rapide

```bash
# 1. Cloner et installer
git clone <repo-url>
cd ffl-capital
npm install

# 2. Configurer la base de données
cp .env.example .env
# Remplir DATABASE_URL (Replit Postgres le fournit), CLERK_*, STRIPE_*, RESEND_* selon besoin
# (RESEND_API_KEY + FROM_EMAIL : emails livraison + Partner Contact Us ; destinataire Contact Us dans Admin Settings)
pnpm run ensure:integrity-env   # defaults Integrity manquants (idempotent)

# 3. Migrations et seed
npx prisma generate
npx prisma migrate deploy
npm run seed

# 4. Lancer le serveur dev
npm run dev
```

## Vérification

```bash
# Santé API + connexion DB
curl http://localhost:3000/api/health

# Tests logique matching (sans DB)
npm run test:matching

# Simuler un lead (serveur dev requis)
npm run seed:lead
```

## Endpoints API (Phase 0)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/health` | Statut serveur + connexion DB |
| POST | `/api/leads/intake` | Webhook LeadConduit (format Boberdoo, public, CORS) |
| POST | `/api/wallet/checkout` | Stripe top-up (partner auth) |
| POST | `/api/refunds` | Demande remboursement partner |
| POST | `/api/partner/contact` | Contact Us partner (Resend → admin + confirmation) |
| POST | `/api/cron/reprocess-unmatched` | Retraitement leads (Bearer CRON_SECRET) |
| POST | `/api/cron/integrity-post` | Post Integrity unmatched (Bearer CRON_SECRET) |
| POST | `/api/admin/lead-routing/preview` | Preview lifecycle routing policy (admin auth) |

Admin APIs : leads search/export/reprocess, **assign-category** (review), **lead-categories** CRUD, **lead-views** CRUD, **lead-routing preview**, partners, filter sets, refunds, **integrity postings** (list + detail payloads) — voir [BACKEND.md](docs/BACKEND.md).

## Dev tools

| URL | Description |
|-----|-------------|
| `/dev/lead-simulator` | Formulaire test → POST intake (dev only) |
| `/feeding-platform` | UI statique soumissions test |

Pour recevoir de **vrais** leads LeadConduit en local : ngrok + [LEADCONDUIT_SETUP.md](docs/LEADCONDUIT_SETUP.md).

## Portails

| Portail | Routes |
|---------|--------|
| Admin | `/admin` — dashboard, leads, partners, refunds, aged, integrity, settings (lead categories, integrations, contact recipient), migration, filter list ; auth `/admin/sign-in`, invite-only `/admin/sign-up` |
| Partner | `/partner` — dashboard, leads, wallet, aged, settings, contact (Resend) ; auth `/sign-in`, `/sign-up` |

## Structure

```
prisma/           # Schéma + migrations
src/app/api/      # Routes API
src/lib/          # Logique métier (matching, intake, wallet)
scripts/          # Seed et tests
fixtures/         # Payloads exemple Boberdoo
docs/             # Documentation projet
```

## Note Supabase

Projet **FFL Capital** : ref `wbzvyvtlopoghvdqltxm`, région `eu-west-3`.  
Dashboard : https://supabase.com/dashboard/project/wbzvyvtlopoghvdqltxm

Copier `.env.example` → `.env`, remplacer `[YOUR-PASSWORD]` par le mot de passe DB (Project Settings → Database).
