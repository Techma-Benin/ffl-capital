# FFL Capital — Backend

> Journal d'implémentation backend — Phase 0 (fondations)  
> Dernière mise à jour : 29 juin 2026

## État actuel

| Composant | Statut |
|-----------|--------|
| Next.js 14 + TypeScript | ✅ |
| Prisma schema (9 tables) | ✅ |
| Migrations SQL versionnées | ✅ |
| RLS Supabase (sans policies anon) | ✅ migration `enable_rls` |
| API `GET /api/health` | ✅ |
| API `POST /api/leads/intake` | ✅ |
| Moteur matching V1 (FIFO) | ✅ |
| Wallet ledger append-only | ✅ |
| Seed partners test | ✅ `npm run seed` |
| Simulateur dev `/dev/lead-simulator` | ✅ (masqué en prod) |
| Projet Supabase dédié | ✅ `wbzvyvtlopoghvdqltxm` (eu-west-3) |
| Prisma baseline (migrations MCP) | ✅ `migrate resolve` |
| Vérification E2E locale | ✅ `npm run verify` |
| Clerk + shells Admin/Partner | ✅ (clés Clerk requises pour activer) |

## Convention de nommage

Le PRD §8 utilise encore le terme `agents`, mais le code utilise **`Partner` / `partners`** (décision D21). Les clés étrangères sont `partner_id`.

## Architecture

```
LeadConduit / simulateur dev
        │
        ▼
POST /api/leads/intake
        │
        ├── validate-intake.ts (Zod)
        ├── normalize-lead.ts (Boberdoo → modèle interne)
        ├── process-intake.ts (persist + match)
        └── matching/engine.ts (priorité DESC, created_at ASC FIFO)
                │
                ▼
           PostgreSQL (Prisma)
```

## Schéma base de données

Tables : `partners`, `leads`, `lead_deliveries`, `refund_requests`, `transactions`, `billing_recurrence`, `resale_postings`, `app_settings`, `migration_jobs`.

Migrations :
- `20250629190000_init` — schéma complet + index
- `20250629190100_enable_rls` — GIN sur `filter_states` + RLS

## Mapping intake Boberdoo

| Champ Boberdoo | Champ interne |
|----------------|---------------|
| `First_Name` / `Last_Name` | `first_name` / `last_name` |
| `Email` | `email` |
| `Primary_Phone` | `phone` |
| `State` ou `State_You_Currently_Live_In` | `state` (uppercase) |
| `Intent` = "High Intent" | `high_intent_iul` |
| `Trusted_Form_URL` | `trustedform_cert_url` |
| `Unique_Identifier` | `external_id` |
| Payload complet | `raw_payload` (jsonb) |

Réponse LeadConduit : `{ "outcome": "success", "reason": "" }`.

## Moteur de matching V1

Critères d'éligibilité partner :
1. `status = active`
2. `filter_states` contient l'état du lead
3. `lead_type` compatible
4. **≥ 15 états** dans `filter_states`
5. `wallet_balance >= prix_effectif` (`price_override` ou `default_realtime_price`)

Tri : `priority DESC`, puis `created_at ASC` (FIFO).

Transaction atomique à la livraison :
- INSERT `lead_deliveries`
- UPDATE `partners.wallet_balance`
- INSERT `transactions` (type `lead_purchase`)
- UPDATE `leads` (`available=false`, `status=delivered`)

## Infra Supabase

**29 juin 2026** — Projet créé dans l'org **billos-e's Org** :

| Champ | Valeur |
|-------|--------|
| Nom | FFL Capital |
| Project ref | `wbzvyvtlopoghvdqltxm` |
| Région | `eu-west-3` |
| URL API | https://wbzvyvtlopoghvdqltxm.supabase.co |
| Dashboard | https://supabase.com/dashboard/project/wbzvyvtlopoghvdqltxm |

Migrations appliquées via Supabase MCP : `init` + `enable_rls`.  
Seed initial (app_settings + 7 partners test) appliqué le 29 juin 2026.

### Connexion locale (Prisma)

1. Dashboard → **Project Settings → Database** → copier le mot de passe
2. Copier `.env.example` → `.env` et remplir :

```
DATABASE_URL=postgresql://postgres.wbzvyvtlopoghvdqltxm:[PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.wbzvyvtlopoghvdqltxm:[PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:5432/postgres
```

3. `npx prisma generate && npm run dev`

### Sécurité RLS

RLS est **activé** sur toutes les tables, **sans policies** `anon`/`authenticated` — accès intentionnellement limité au serveur Next.js via Prisma (pas de clé anon côté client). L'advisor Supabase signale « RLS enabled no policy » : c'est voulu pour Phase 0.

## Commandes dev

```bash
npm install
cp .env.example .env   # puis remplir DATABASE_URL
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run dev
npm run verify        # tests health + matching TX/CA
npm run seed:lead       # POST fixture vers intake (serveur dev requis)
```

## Partners de test (seed)

| Email | Rôle test |
|-------|-----------|
| `tx-priority10@ffl-test.local` | TX, priorité 10 — gagne le match |
| `fifo-older@ffl-test.local` | TX, priorité 8, créé en premier (FIFO) |
| `fifo-newer@ffl-test.local` | TX, priorité 8, créé après |
| `ca-partner@ffl-test.local` | CA uniquement |
| `low-balance@ffl-test.local` | Solde 5 $ — exclu |
| `few-states@ffl-test.local` | 5 états — exclu (< 15) |
| `pending@ffl-test.local` | `pending_approval` — exclu |

## Journal des décisions

| Date | Décision |
|------|----------|
| 2026-06-29 | Table `partners` (pas `agents`) |
| 2026-06-29 | Accès DB serveur uniquement — RLS sans policies PostgREST |
| 2026-06-29 | Scripts seed en `.mjs` (évite dépendance esbuild/tsx) |
| 2026-06-29 | Jobs cron (24h, J+30) documentés mais hors scope Phase 0 |

## Hors scope Phase 0 (Phase 1b+)

- Clerk auth + portails Admin/Partner
- Stripe webhooks
- Jobs cron retraitement 24h / aging J+30
- IntegrityCONNECT live
- Migration import Boberdoo

## Stratégie jobs planifiés (à implémenter)

Option A : `pg_cron` Supabase  
Option B : cron externe (cron-job.org) appelant des routes API protégées

Jobs prévus :
- Retraitement leads unmatched (fenêtre 24h)
- Marquage aged leads (J+30)
