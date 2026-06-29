# FFL Capital — Lead Distribution Platform

Plateforme propriétaire de distribution de leads IUL pour FFL Capital (Integrity Marketing). Remplace Boberdoo avec marketplace aged leads en self-service.

## Documentation

- [PRD](docs/PRD.md) — spécification produit complète
- [PROJECT](docs/PROJECT.md) — mémoire projet et décisions
- [BACKEND](docs/BACKEND.md) — architecture backend et journal d'implémentation
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
# Remplir DATABASE_URL et DIRECT_URL depuis Supabase

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
| POST | `/api/leads/intake` | Webhook LeadConduit (format Boberdoo) |

## Dev tools

- `/dev/lead-simulator` — formulaire de test (dev only, masqué en production)

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

Un projet Supabase dédié « FFL Capital » doit être créé (voir [BACKEND.md § Infra](docs/BACKEND.md)). Si la limite de projets gratuits est atteinte, mettre en pause un projet existant avant de créer le nouveau.
