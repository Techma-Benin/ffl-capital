# FFL Capital — Lead Distribution Platform

Plateforme propriétaire de distribution de leads IUL pour FFL Capital (Integrity Marketing). Remplace Boberdoo avec marketplace aged leads en self-service.

## Documentation

- [PRD](docs/PRD.md) — spécification produit complète
- [PROJECT](docs/PROJECT.md) — mémoire projet et décisions
- [BACKEND](docs/BACKEND.md) — architecture backend et journal d'implémentation
- [LEADCONDUIT_SETUP](docs/LEADCONDUIT_SETUP.md) — connexion LeadConduit / ngrok / cutover prod
- [CORE_BACKEND_PLAN](docs/CORE_BACKEND_PLAN.md) — plan backend core (✅ complété)
- [Boberdoo exploration](docs/BOBERDOO_EXPLORATION.md) — parité fonctionnelle
- [Gap analysis](docs/BOBERDOO_GAP_ANALYSIS.md) — inventaire vs Boberdoo (mis à jour juil. 2026)

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Prisma** + PostgreSQL (Supabase dev → Replit prod)
- **Clerk** auth (admin + partner)
- **Stripe** wallet (test keys; prod après validation)

## Setup rapide

### Replit

1. Activer le module **PostgreSQL** dans le Repl — Replit injecte **`DATABASE_URL`** (vérifier dans Secrets / Database).
2. Après chaque pull : `bash scripts/post-merge.sh` (ou laisser le hook post-merge le faire).
3. Première fois sur une base vide : `npm run seed`.
4. Lancer : **Run** (`npm run dev -- -p 5000`) ou `npm run dev -- -p 5000`.

Pas besoin de **`DIRECT_URL`** (Supabase seulement) ; Prisma utilise uniquement **`DATABASE_URL`**.

### Local / Supabase

```bash
# 1. Cloner et installer
git clone <repo-url>
cd ffl-capital
npm install

# 2. Configurer la base de données
cp .env.example .env
# Remplir DATABASE_URL (Replit Postgres le fournit), CLERK_*, STRIPE_* selon besoin

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

# Checklist backend E2E (dev server must be running; Replit Run → port 5000)
API_BASE_URL=http://127.0.0.1:5000 npm run verify   # Replit
npm run verify                                      # local default http://127.0.0.1:3000

# Simuler un lead (serveur dev requis)
npm run seed:lead

# Données demo remboursements admin (/admin/refunds)
npm run seed:refunds-demo

# Leads vieillis pour /admin/aged et /partner/aged
npm run seed:aged-leads
```

## Endpoints API (principaux)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/health` | Statut serveur + connexion DB |
| POST | `/api/leads/intake` | Webhook LeadConduit (format Boberdoo, public, CORS) |
| POST | `/api/wallet/checkout` | Stripe top-up (partner auth) |
| POST | `/api/refunds` | Demande remboursement partner |
| POST | `/api/cron/reprocess-unmatched` | Retraitement leads (Bearer CRON_SECRET) |
| POST | `/api/cron/integrity-post` | Post Integrity unmatched (Bearer CRON_SECRET) |

Admin APIs : leads search/export/reprocess, **lead-views** CRUD, partners, filter sets, refunds — voir [BACKEND.md](docs/BACKEND.md).

## Dev tools

| URL | Description |
|-----|-------------|
| `/dev/lead-simulator` | Formulaire test → POST intake (dev only) |
| `/feeding-platform` | UI statique soumissions test |

Pour recevoir de **vrais** leads LeadConduit en local : ngrok + [LEADCONDUIT_SETUP.md](docs/LEADCONDUIT_SETUP.md).

## Portails

| Portail | Routes |
|---------|--------|
| Admin | `/admin` — dashboard, leads, partners, refunds, aged, integrity, settings, migration, filter list |
| Partner | `/partner` — dashboard, leads, wallet, aged, settings, contact |

## Structure

```
prisma/           # Schéma + migrations
src/app/api/      # Routes API
src/lib/          # Logique métier (matching, intake, wallet, delivery)
scripts/          # Seed et tests
fixtures/         # Payloads exemple Boberdoo
docs/             # Documentation projet
```

## Note Supabase

Projet **FFL Capital** : ref `wbzvyvtlopoghvdqltxm`, région `eu-west-3`.  
Dashboard : https://supabase.com/dashboard/project/wbzvyvtlopoghvdqltxm

Copier `.env.example` → `.env`, remplacer `[YOUR-PASSWORD]` par le mot de passe DB (Project Settings → Database).
