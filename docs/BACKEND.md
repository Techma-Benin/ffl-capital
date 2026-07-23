# FFL Capital — Backend

> Journal d'implémentation backend  
> Dernière mise à jour : 21 juillet 2026

**Plan backend core :** [CORE_BACKEND_PLAN.md](CORE_BACKEND_PLAN.md) — ✅ **9 phases complétées** (juil. 2026).

---

## État actuel

### Fondations (Phase 0 — fait)

| Composant | Statut |
|-----------|--------|
| Next.js 14 + TypeScript | ✅ |
| Prisma schema (9 tables) | ✅ |
| Migrations SQL versionnées | ✅ |
| RLS Supabase (sans policies anon) | ✅ |
| API `GET /api/health` | ✅ |
| API `POST /api/leads/intake` | ✅ |
| Moteur matching V1 (FIFO) | ✅ |
| Wallet ledger append-only | ✅ |
| Seed partners test | ✅ `npm run seed` |
| Simulateur dev `/dev/lead-simulator` | ✅ |
| Feeding platform `/feeding-platform` | ✅ |
| Projet Supabase `wbzvyvtlopoghvdqltxm` | ✅ eu-west-3 |
| Vérification E2E locale | ✅ `npm run verify` |

### Portails + intégrations (juillet 2026 — fait)

| Composant | Statut |
|-----------|--------|
| Clerk auth (admin / partner séparés) | ✅ |
| Onboarding partner + approbation admin | ✅ |
| Stripe Checkout top-up + webhook | ✅ |
| Auto-recharge hebdomadaire (abonnement Stripe) | ✅ |
| Email livraison lead (Resend) | ✅ (si `RESEND_API_KEY`) |
| Webhook CRM générique (`crmWebhookUrl`) | ✅ |
| Remboursements Type A / Type B | ✅ |
| Marketplace aged (achat + débit wallet) | ✅ |
| Migration import CSV Boberdoo | ✅ |
| Cron reprocess unmatched + Integrity post | ✅ (routes ; scheduler prod à configurer) |
| IntegrityCONNECT ping/post | ✅ mode mock ; live en attente specs client |

### Core backend completion (juillet 2026 — fait)

| Composant | Statut |
|-----------|--------|
| Champs lead Boberdoo étendus (~25 champs) | ✅ migration `20250706190000` |
| Table `lead_events` (audit log) | ✅ |
| Table `partner_filter_sets` + backfill | ✅ migration `20250710140000` |
| Credentials livraison (`crmProvider`, Ringy) | ✅ |
| Clés `app_settings` étendues | ✅ |
| Détection doublons + idempotence intake | ✅ |
| Validation TrustedForm (optionnelle) | ✅ |
| Matching v2 (filter sets + limites H/J) | ✅ |
| APIs admin filter-list + filter-sets CRUD | ✅ |
| APIs admin leads (search, edit, export, timeline, redeliver, delete) | ✅ |
| Table `lead_list_views` + APIs lead-views (admin + partner CRUD, default) | ✅ migration `20260721120000` |
| Remboursements bulk + admin-initiated | ✅ |
| Driver Ringy + logging livraison | ✅ |
| Integrity payload builders + mode storefront | ✅ mock |
| Seuil aged configurable | ✅ `aged_days_threshold` |
| `scripts/verify-cron.mjs` | ✅ |
| `scripts/verify-backend.mjs` étendu | ✅ |

### Reporté / hors scope

| Zone | Statut |
|------|--------|
| Auto-recharge au seuil de solde | ⏸ reporté |
| IntegrityCONNECT live | ⏸ specs client |
| Stripe prod | ⏳ après validation test keys |
| Polish UI avancé (charts Boberdoo, billing PDF) | ⏳ hors scope V1 |

---

## Convention de nommage

Le PRD §8 utilise encore le terme `agents`, mais le code utilise **`Partner` / `partners`** (décision D21). Les clés étrangères sont `partner_id`.

---

## Architecture

```
Meta / LeadConduit / feeding-platform / simulateur dev
        │
        ▼
POST /api/leads/intake
        │
        ├── validate-intake.ts (Zod)
        ├── normalize-lead.ts (Boberdoo → modèle interne)
        ├── process-intake.ts (persist + match)
        └── matching/engine.ts (priorité DESC, created_at ASC FIFO)
                │
                ├── deliverLead → Resend email + CRM webhook
                └── unmatched → cron reprocess (< 24h) → Integrity post (> 24h)
                        │
                        ▼
                   PostgreSQL (Prisma)
```

**Cible post-plan :** matching sur `partner_filter_sets`, événements dans `lead_events`, intake avec doublons + TrustedForm — **implémenté**.

---

## Schéma base de données

**Tables actuelles :** `partners`, `partner_filter_sets`, `lead_list_views`, `leads`, `lead_events`, `lead_deliveries`, `refund_requests`, `transactions`, `billing_recurrence`, `resale_postings`, `app_settings`, `migration_jobs`.

**Migrations :**
- `20250629190000_init` — schéma complet + index
- `20250629190100_enable_rls` — GIN sur `filter_states` + RLS
- `20250706190000_lead_boberdoo_fields` — champs lead étendus
- `20250710140000_core_backend_schema` — `lead_events`, `partner_filter_sets`, credentials, TrustedForm
- `20260721120000_lead_list_views` — vues liste leads (seed admin, défaut par partner), RLS

---

## APIs lead list views

Auth : session **admin** ou **partner** (routes miroir sous `/api/admin/lead-views` et `/api/partner/lead-views`). Schéma Zod : `src/lib/leads/list-view-schema.ts`.

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `.../lead-views` | Liste des vues du scope (partner : partner courant uniquement) |
| POST | `.../lead-views` | Création |
| GET | `.../lead-views/[id]` | Détail |
| PATCH | `.../lead-views/[id]` | Mise à jour partielle |
| DELETE | `.../lead-views/[id]` | Suppression (interdit si seule vue ou vue par défaut) |
| POST | `.../lead-views/[id]/default` | Définir comme vue par défaut |

**Corps POST (création)** — champs requis sauf `isDefault` :

```json
{
  "name": "My view",
  "filters": {},
  "sort": { "field": "receivedAt", "direction": "desc" },
  "columns": [{ "key": "name", "visible": true }],
  "isDefault": false
}
```

**Corps PATCH** — sous-ensemble optionnel de `name`, `filters`, `sort`, `columns`, `isDefault`. Le sélecteur de colonnes (admin + partner) persiste `{ "columns": [...] }` sur la vue active via `PATCH .../lead-views/[id]` (debounce côté client, flush à la fermeture du panneau). Le layout cartes/tableau reste en `localStorage` (`admin-leads-table-layout` / `partner-leads-table-layout`), pas les colonnes.

**Filtres admin** (`filters`) : `statusSlice` (`all` \| `matched` \| `unmatched` \| `integrity_posted` \| `aged_listed`), optionnel `states` (tableau de codes US 2 lettres ; vide ou absent = tous les états ; l’ancien champ `state` unique est migré à la lecture), `datePeriod` (`today` \| `yesterday` \| `last_7_days` \| `last_month` \| `custom`), et si `datePeriod` = `custom` optionnel `from` / `to` (dates ISO `YYYY-MM-DD`, bornes `receivedAt` en jours calendaires locaux), optionnel `q`. Les vues sans `datePeriod` mais avec `from`/`to` sont traitées comme `custom`.

**Filtres partner** (`filters`) : optionnel `filterSetId`, `locations[]`, `channels[]` (`realtime` \| `aged`), `types[]`, `statuses[]` (`active` \| `refund_pending` \| `refunded`).

**Réponse** (GET liste / détail / mutations) : enregistrement Prisma `LeadListView` — `id`, `scope`, `partnerId`, `name`, `filters`, `sort`, `columns`, `isDefault`, `createdByClerkUserId`, `createdAt`, `updatedAt`.

**Export CSV admin** : `GET /api/admin/leads/export?viewId=<uuid>` applique filtres + tri de la vue (colonnes export inchangées côté serveur).

**Service** : `src/lib/leads/lead-list-view-service.ts` ; requêtes liste : `admin-leads-query.ts` / `partner-leads-query.ts`.

### Dashboard admin (`/admin`)

Pas d’API dédiée — la page SSR lit les query params et filtre en base.

| Param | Valeurs | Effet |
|-------|---------|--------|
| `period` | `today` \| `yesterday` \| `last_7_days` \| `custom` | Preset calendaire local sur `receivedAt` / `deliveredAt` |
| `from`, `to` | `YYYY-MM-DD` | Requis pour bornes en mode `custom` (ou seuls → `custom` implicite) |
| *(absent)* | — | Défaut `last_7_days` |

**URL canonique** : si la période n’est pas « explicite » (`adminDashboardHasExplicitPeriod` — ex. `/admin` nu, ou `period=custom` sans `from`/`to`), la page SSR **redirige** vers `/admin?period=last_7_days`. Les données suivent le même défaut via `parseAdminDashboardPeriod`.

Helpers : `parseAdminDashboardPeriod`, `resolveAdminDashboardReceivedAtRange`, `adminDashboardPeriodDisplayLabel` (`src/lib/admin/admin-date-period.ts`). Agrégats graphiques : `getAdminDashboardChartData` (`src/lib/admin/dashboard-stats.ts`). UI : `AdminDashboardPeriodFilter` ; **Custom** ouvre `AdminDateRangePopover` en panneau **modal** ancré en-tête (`hideTrigger`, backdrop) — l’URL `period=custom&from&to` n’est écrite qu’au **Apply** (le choix Custom seul ne laisse pas une URL custom incomplète) ; plage custom plafonnée au **jour calendaire local courant** (pas de dates futures).

### Admin aged browse (`/admin/aged`)

Pas d’API dédiée — page SSR : `buildAdminAgedLeadsWhere()` (`src/lib/admin/admin-aged-leads-filters.ts` → `buildAgedLeadWhereWithCutoff`, seuil `aged_days_threshold`, exclut `status=dead`), prix affiché via `getDefaultAgedPrice()`.

| Param | Valeurs | Effet |
|-------|---------|--------|
| `state` | codes US comma-séparés (ex. `TX,CA`) | Filtre `state IN (...)` |
| `type` | `traditional_iul` \| `high_intent_iul` | Filtre `leadType` |
| `status` | `unmatched` \| `delivered` \| `integrity_posted` \| `aged_listed` \| `review` | Filtre `status` (hors `dead` déjà exclu) |
| `age` | `30` \| `60` \| `90` | Bucket jours sur `receivedAt` (même logique que `/partner/aged`) |
| `page` | entier | Pagination (`parsePageParams`, 25/page) |
| `sort` | `name` \| `state` \| `type` \| `status` \| `ageDays` \| `price` | Colonne de tri Prisma |
| `dir` | `asc` \| `desc` | Sens ; défaut `desc` si `sort` absent, sinon `asc` si `dir` invalide |

Tri : `src/lib/admin/admin-aged-leads-sort.ts` (`buildAdminAgedLeadOrderBy` — `ageDays` ↔ `receivedAt` inversé ; `price` ↔ `id` proxy). UI : `AdminAgedLeadsTable` + en-têtes `PortalSortableHeaderCell`.

**Mark dead (ligne)** : `DELETE /api/admin/leads/:id` (existant) → `status=dead`, `available=false` ; retire le lead de la liste aged.

### Partner aged marketplace (`/partner/aged`)

Même **pool** d’éligibilité que admin (`buildAdminAgedLeadsWhere` / seuil `aged_days_threshold`, hors `dead`). **Les filter sets partner ne restreignent pas** le listing ni l’achat aged — seuls le matching temps réel et les remboursements « wrong filter » s’appuient sur les filter sets (`partner_filter_sets.lead_type`).

**Chargement** : SSR charge une fois jusqu’à `PARTNER_AGED_CLIENT_LOAD_LIMIT` (2500) leads éligibles sans filtre state/type/age/haveIul ; filtres et pagination appliqués **côté client** (pas de re-fetch SSR par changement de filtre). Paramètres URL (`state`, `type`, `age`, `haveIul`) synchronisés via `history.replaceState` pour partage. Si le pool dépasse la limite, bannière + sous-ensemble trié par `receivedAt` asc.

| Param | Valeurs | Effet |
|-------|---------|--------|
| `state` | code US 2 lettres (ex. `TX`) | Filtre client `state` (optionnel ; URL seulement) |
| `type` | `traditional_iul` \| `high_intent_iul` | Filtre client `leadType` (optionnel) |
| `age` | `30` \| `60` \| `90` | Bucket jours sur `receivedAt` (`filterPartnerAgedLeadsInMemory`) |
| `haveIul` | `Yes` \| `No` \| `empty` | Filtre client sur `haveIul` (`empty` = null/vide) |

**Achat** : `POST /api/leads/aged/purchase` — `purchaseAgedLeads()` : partenaire `active`, lead dans le where aged, débit wallet ; pas de garde filter set / min 15 états.

---

## Mapping intake Boberdoo

| Champ Boberdoo | Champ interne |
|----------------|---------------|
| `First_Name` / `Last_Name` | `first_name` / `last_name` |
| `Email` | `email` |
| `Primary_Phone` | `phone` |
| `Address`, `City`, `Zip`, `DOB`, `Age` | colonnes homonymes |
| `State` ou `State_You_Currently_Live_In` | `state` (uppercase) |
| `Intent` = "High Intent" | `high_intent_iul` |
| `Have_IUL`, `Primary_Goal` | `have_iul`, `primary_goal` |
| `Trusted_Form_URL` | `trustedform_cert_url` |
| `TCPA_Consent`, `TCPA_Language`, `LeadiD_Token` | colonnes homonymes |
| `SRC`, `Landing_Page`, `Sub_ID`, `Pub_ID` | tracking |
| `Unique_Identifier` | `external_id` |
| `Lead_Type` | `boberdoo_lead_type` |
| `IP_Address`, `User_Agent` | colonnes homonymes |
| Payload complet | `raw_payload` (jsonb) |

Réponse LeadConduit : `{ "outcome": "success", "reason": "" }` (chaîne vide en cas de succès).

**Note TrustedForm :** le certificat arrive dans le payload webhook (Meta → LeadConduit → plateforme). Pas besoin d'accès admin TrustedForm pour l'intake — il suffit de rediriger le webhook vers `/api/leads/intake` quand on coupe Boberdoo.

---

## Moteur de matching V1 (actuel)

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

**V2 (implémenté) :** éligibilité via `partner_filter_sets` actifs + limites horaires/journalières ; `filterSetId` sur `lead_deliveries`.

---

## Auth admin

- Comptes **admin** et **partner** sont **séparés** (URLs et flux Clerk distincts).
- Admin : allowlist email `ADMIN_EMAILS` → promotion automatique au login (`promote-admin.ts`).
- **Pas de promotion** partner → admin — une personne qui a les deux rôles a deux comptes.

---

## Intégrations

| Intégration | Mode | Variables / notes |
|-------------|------|-------------------|
| Stripe wallet | test puis prod | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — valider en test avant prod |
| Resend email | optionnel | `RESEND_API_KEY`, `FROM_EMAIL` |
| CRM webhook | par partner | `partners.crm_webhook_url` |
| Ringy | ✅ | `partners.ringy_sid`, `ringy_auth_token`, `crm_provider=ringy` |
| IntegrityCONNECT | mock / live | `INTEGRITY_PING_URL`, `INTEGRITY_POST_URL`, `integrations_mode` dans app_settings |
| Cron jobs | routes prêtes | `CRON_SECRET` + `npm run verify:cron` (ajouter script) |

---

## Stratégie jobs planifiés

Routes protégées par `Authorization: Bearer $CRON_SECRET` :

| Route | Fréquence suggérée | Rôle |
|-------|-------------------|------|
| `POST /api/cron/reprocess-unmatched` | 5–15 min | Retente match < 24h ; poste Integrity au-delà |
| `POST /api/cron/integrity-post` | 15–30 min | Poste leads unmatched > 24h vers IntegrityCONNECT |

Options : `pg_cron` Supabase, Vercel Cron, cron-job.org.

Implémentation : `src/lib/jobs/reprocess-unmatched.ts`, `src/lib/integrity/*`

---

## Infra Supabase

| Champ | Valeur |
|-------|--------|
| Nom | FFL Capital |
| Project ref | `wbzvyvtlopoghvdqltxm` |
| Région | `eu-west-3` |
| Dashboard | https://supabase.com/dashboard/project/wbzvyvtlopoghvdqltxm |

### Connexion locale (Prisma)

```
DATABASE_URL=postgresql://postgres.wbzvyvtlopoghvdqltxm:[PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.wbzvyvtlopoghvdqltxm:[PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:5432/postgres
```

### Sécurité RLS

RLS activé sur toutes les tables, **sans policies** `anon`/`authenticated` — accès serveur Next.js via Prisma uniquement.

---

## Commandes dev

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run dev
npm run verify          # checklist backend
node scripts/verify-cron.mjs  # smoke test cron routes
npm run seed:lead       # POST fixture intake
stripe:listen           # webhook Stripe local
```

---

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

**Test aged marketplace :** créer des leads avec `received_at` backdaté de 31+ jours (pas besoin d'attendre 30 jours réels).

---

## Journal des décisions

| Date | Décision |
|------|----------|
| 2026-06-29 | Table `partners` (pas `agents`) |
| 2026-06-29 | Accès DB serveur uniquement — RLS sans policies PostgREST |
| 2026-06-29 | Scripts seed en `.mjs` |
| 2026-07-03 | Build V1 : delivery, refunds, Stripe, aged, cron, Integrity mock |
| 2026-07-06 | Démo client — flux partner + admin validé ; refunds codés post-call |
| 2026-07-10 | Plan core backend validé — voir [CORE_BACKEND_PLAN.md](CORE_BACKEND_PLAN.md) |
| 2026-07-10 | Filter sets multiples (parité Boberdoo), pas profil unique long terme |
| 2026-07-10 | Auto-recharge au seuil de solde reportée ; garder abonnement hebdo |
| 2026-07-10 | Pas de promotion partner → admin ; comptes séparés |
| 2026-07-10 | Integrity live bloqué sur specs client ; mock en place |
| 2026-07-10 | Core backend 9 phases implémentées — voir journal ci-dessus |
| 2026-07-21 | Vues liste leads (`lead_list_views`) — remplace onglets statut admin ; CRUD admin/partner |
| 2026-07-23 | Colonnes liste leads — persistance `columns` sur la vue (PATCH) ; plus de `admin-leads-visible-columns` |
| 2026-07-23 | Dashboard admin — URL canonique `last_7_days`, custom modal + Apply ; custom sans dates futures |
| 2026-07-22 | Dashboard admin — filtre période URL + stats/graphiques/leads récents |
| 2026-07-22 | Admin aged — tableau tri URL + pagination + mark dead (UI) |
