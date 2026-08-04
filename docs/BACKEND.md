# FFL Capital — Backend

> Journal d'implémentation backend  
> Dernière mise à jour : 4 août 2026

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
| Seed partners test | ✅ `pnpm run seed` |
| Simulateur dev `/dev/lead-simulator` | ✅ |
| Feeding platform `/feeding-platform` | ✅ |
| Projet Supabase `wbzvyvtlopoghvdqltxm` | ✅ eu-west-3 |
| Vérification E2E locale | ✅ `pnpm run verify` |

### Portails + intégrations (juillet 2026 — fait)

| Composant | Statut |
|-----------|--------|
| Clerk auth (admin / partner séparés) | ✅ |
| Onboarding partner + approbation admin | ✅ |
| Stripe Checkout top-up + webhook | ✅ |
| Auto-recharge hebdomadaire (abonnement Stripe) | ✅ |
| Email livraison lead (Resend) | ✅ (si `RESEND_API_KEY`) |
| CRM outbound partner (POST self-service) | ✅ — voir [PARTNER_CRM_OUTBOUND.md](PARTNER_CRM_OUTBOUND.md) |
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
| Templates filter set unifiés dans `partner_filter_sets` (`isTemplate`) | ✅ migration `20260724200000` |
| Table `partner_crm_outbound_configs` | ✅ migration `20250723190000` |
| Clés `app_settings` étendues | ✅ |
| Détection doublons + idempotence intake | ✅ |
| Validation TrustedForm (optionnelle) | ✅ |
| Matching v2 (filter sets + limites H/J) | ✅ |
| APIs admin filter-list + filter-sets CRUD | ✅ |
| APIs admin leads (search, edit, export, timeline, redeliver, delete) | ✅ |
| Table `lead_list_views` + APIs lead-views (admin + partner CRUD, default) | ✅ migration `20260721120000` |
| Remboursements bulk + admin-initiated | ✅ |
| Driver CRM outbound + logging `crm_outbound` | ✅ |
| Integrity payload builders + mode storefront | ✅ mock |
| Seuil aged configurable | ✅ `aged_days_threshold` |
| `scripts/verify-cron.mjs` | ✅ |
| `scripts/verify-backend.mjs` étendu | ✅ |
| Catégories lead flexibles (`lead_category_criteria`, résolution intake) | ✅ migration `20260730170000` |
| Reclassification automatique après changement des règles catégories | ✅ sans migration supplémentaire |

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
        ├── normalize-lead.ts (Boberdoo → modèle interne ; sans résolution leadType)
        ├── process-intake.ts
        │     ├── evaluateLeadCategories (payload brut vs catégories actives)
        │     ├── persist (leadType nullable ; categoryResolution ; review si 0/N match)
        │     └── matchLead si résolution OK + TrustedForm OK
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

**Tables actuelles :** `partners`, `partner_filter_sets`, `lead_list_views`, `lead_categories`, `lead_category_criteria`, `leads`, `lead_events`, `lead_deliveries`, `refund_requests`, `transactions`, `billing_recurrence`, `resale_postings`, `app_settings`, `migration_jobs`.

**`partner_filter_sets` :** sets live (`partnerId` requis, `isTemplate=false`) et templates admin (`partnerId` null, `isTemplate=true`). Ancienne table `filter_set_templates` migrée puis droppée (`20260724200000_unify_filter_set_templates`). Colonne `description` retirée (`20260724210000_drop_partner_filter_set_description`).

**Migrations :**
- `20250629190000_init` — schéma complet + index
- `20250629190100_enable_rls` — GIN sur `filter_states` + RLS
- `20250706190000_lead_boberdoo_fields` — champs lead étendus
- `20250710140000_core_backend_schema` — `lead_events`, `partner_filter_sets`, credentials, TrustedForm
- `20260721120000_lead_list_views` — vues liste leads (seed admin, défaut par partner), RLS
- `20260724200000_unify_filter_set_templates` — templates → `partner_filter_sets.is_template` ; drop `filter_set_templates`
- `20260724210000_drop_partner_filter_set_description` — drop `partner_filter_sets.description`
- `20260730170000_flexible_lead_categories` — `lead_category_criteria` ; drop `lead_categories.src` ; `leads.category_resolution`, `category_candidate_types` ; `lead_type` nullable
- `20260730120000_add_category_assigned_event` — `LeadEventType.category_assigned` (assignation manuelle admin)

**`lead_categories` :** source de vérité pour la classification produit. Chaque ligne a un `type` interne immuable (snake_case généré à la création), un `label` admin, `integrity_label`, `enabled`, et des **critères** enfants (`field` + `value`, correspondance exacte case-sensitive sur une clé top-level du payload webhook). Plus de colonne `src` — les anciennes valeurs SRC ont été migrées en lignes `field='SRC'`.

**`leads` (catégorisation) :** `lead_type` (string, nullable) ; `category_resolution` (`matched` \| `no_match` \| `multiple_matches`) ; `category_candidate_types` (text[], types des catégories qui ont matché). Zéro ou plusieurs matchs → `status=review`, `available=false`, pas de matching partenaire ni post Integrity.

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

**Filtres admin** (`filters`) : `statusSlice` (`all` \| `matched` \| `unmatched` \| `integrity_posted` \| `aged_listed`), optionnel `types[]`, `filterSetId`, `states[]` (codes US 2 lettres), `datePeriod` (`today` \| `yesterday` \| `last_7_days` \| `last_month` \| `all_time` \| `custom`), bornes custom `from` / `to` (`YYYY-MM-DD`, sur `Lead.receivedAt`), et `q`. `all_time` = pas de `gte`, `lte` = fin du jour courant (`resolveLeadViewDateRange`). L’UI listes leads expose les presets sans `all_time` (réservé au dashboard). `types` contient les types internes des catégories et deux sentinelles : `__unclassified__` (`no_match`) et `__multiple_category_match__` (`multiple_matches`). Un type normal matche soit un lead résolu avec ce `leadType`, soit un lead `multiple_matches` dont `categoryCandidateTypes` contient ce type ; toutes les sélections Type sont combinées en OR. `filterSetId` exige qu’au moins une `LeadDelivery` du lead soit attribuée à ce filter set ; l’UI ne propose que les sets live, avec libellé `nom — Partner` pour les sets possédés et le nom seul sinon.

Compatibilité admin : l’ancien `state` unique est migré vers `states[]`; les anciens `categoryResolution` / `categoryCandidateTypes` sont prétraités vers `types[]`, retirés du JSON normalisé à la prochaine sauvegarde. Des bornes `from`/`to` sans `datePeriod` impliquent `custom`.

**Filtres partner** (`filters`) : optionnel `filterSetId`, `locations[]`, `channels[]` (`realtime` \| `aged`), `types[]`, `statuses[]` (`active` \| `refund_pending` \| `refunded`), `datePeriod` (mêmes presets admin) et bornes custom `from` / `to`. La période porte sur `LeadDelivery.deliveredAt`, pas sur `Lead.receivedAt`; des bornes sans preset impliquent `custom`.

**Brouillon appliqué (UI)** : les pages `/admin/leads` et `/partner/leads` acceptent `?draft=<JSON encodé>` en plus de `?view=<uuid>`. Il contient `name`, `filters` et `columns`, est validé avec le schéma du scope, puis appliqué à la liste sans écriture API. Un brouillon qui diffère de la vue persistée affiche l’action page-level **Save view** ; sa sauvegarde fait le `PATCH` habituel et retire `draft` de l’URL. Les liens de tri et la pagination conservent le brouillon. Un `draft` invalide ou identique à la vue est ignoré.

**Réponse** (GET liste / détail / mutations) : enregistrement Prisma `LeadListView` — `id`, `scope`, `partnerId`, `name`, `filters`, `sort`, `columns`, `isDefault`, `createdByClerkUserId`, `createdAt`, `updatedAt`.

**Export CSV admin** : `GET /api/admin/leads/export?viewId=<uuid>` applique filtres + tri de la vue (colonnes export inchangées côté serveur).

**Service** : `src/lib/leads/lead-list-view-service.ts` ; requêtes liste : `admin-leads-query.ts` / `partner-leads-query.ts`.

### Dashboard admin (`/admin`)

**Charge SSR par défaut** : `fetchAdminDashboardRawData` sur les **90 derniers jours** calendaires (`ADMIN_DASHBOARD_CLIENT_FILTER_LOOKBACK_DAYS`). Les presets courts (today, yesterday, last 7 days, last month) et les plages custom dont le début reste **dans** cette fenêtre filtrent **côté client** (`computeAdminDashboardView`) sans nouvelle requête DB. L’URL est mise à jour via `history.replaceState` (partageable).

**Refetch serveur** quand `adminDashboardNeedsServerRefetch` est vrai — `all_time`, ou `custom` dont `from` est **avant** le `windowStart` 90 j :
- Client : `GET /api/admin/dashboard?period=&from=&to=` (auth admin) → payload brut pour la plage demandée
- SSR : si l’URL d’atterrissage nécessite une plage étendue, charge étendue en parallèle (même helper) au lieu de se limiter aux 90 j

| Param | Valeurs | Effet |
|-------|---------|--------|
| `period` | `today` \| `yesterday` \| `last_7_days` \| `last_month` \| `all_time` \| `custom` | Preset calendaire local sur `receivedAt` / `deliveredAt` ; `all_time` = pas de `gte`, `lte` = fin du jour |
| `from`, `to` | `YYYY-MM-DD` | Requis pour bornes en mode `custom` (ou seuls → `custom` implicite) |
| *(absent)* | — | Défaut `last_7_days` |

**URL canonique** : si la période n’est pas « explicite » (`adminDashboardHasExplicitPeriod` — ex. `/admin` nu, ou `period=custom` sans `from`/`to`), la page SSR **redirige** vers `/admin?period=last_7_days`. Les données suivent le même défaut via `parseAdminDashboardPeriod`.

**Lead Intake (graphique)** : granularité adaptative selon le nombre de jours calendaires inclusifs de la plage (`resolveChartGranularity`) — ≤1 j → horaire (« Hourly volume ») ; 2–60 j → journalier (« Daily volume », ex. `last_month` ~30 points) ; 61–90 j → fenêtres glissantes de 7 jours depuis le début de plage (pas Mon–Sun calendaire, « Weekly volume ») ; >90 j → mensuel. Libellés weekly = **date unique** (début de bucket, ex. `May 5`), pas de plage `A–B`. Buckets vides conservés à zéro ; jours calendaires locaux.

**Delivering (donut)** : taux de livraison parmi les leads **entrés** sur la période (`Lead.receivedAt` dans la plage). Segments = Delivered vs Not delivered — Delivered = leads entrés dont `status = delivered` (**compte leads**, pas lignes `LeadDelivery`). Centre = `deliveryRatePercent` (arrondi) + label « Delivered » ; aucun lead entré → donut vide (« No leads yet »). Le KPI livraisons (`deliveriesInPeriod`) reste un **compte d’événements** `LeadDelivery` — distinct du donut. Agrégats : `computeAdminDashboardChartData` → `deliveringDonut` + `deliveryRatePercent`.

Helpers : `parseAdminDashboardPeriod`, `resolveAdminDashboardReceivedAtRange`, `adminDashboardNeedsServerRefetch`, `adminDashboardPeriodDisplayLabel` (`src/lib/admin/admin-date-period.ts`). Données + agrégats : `fetchAdminDashboardRawData`, `computeAdminDashboardView` (`src/lib/admin/dashboard-stats.ts`). API : `src/app/api/admin/dashboard/route.ts`. UI : `AdminDashboardView` + `AdminDashboardPeriodFilter` ; **Custom** ouvre `AdminDateRangePopover` en panneau **modal** ancré en-tête (`hideTrigger`, backdrop) — l’URL `period=custom&from&to` n’est écrite qu’au **Apply** (le choix Custom seul ne laisse pas une URL custom incomplète) ; plage custom plafonnée au **jour calendaire local courant** (pas de dates futures). Cache client : clé `admin-dashboard` via `src/lib/client-store`.

### Client store (load-once / SWR léger)

Module `src/lib/client-store` (pas de dépendance Zustand/SWR) : cache mémoire clé → données, `useClientResource` (seed SSR + mutate / invalidate), clés dans `ClientStoreKeys`.

| Page | Approche | Skip / notes |
|------|----------|--------------|
| `/admin` dashboard | Charge 90 j + filtre client + store ; refetch `GET /api/admin/dashboard` si all_time / custom hors fenêtre | — |
| `/admin/partners` | Charge jusqu’à 2000 partners + filtre/tri/page client + store | Cap `ADMIN_PARTNERS_CLIENT_LOAD_LIMIT` |
| `/admin/filter-list` | SSR sets live + templates ; store ; édition via pages dédiées (pas de modal) | — |
| `/admin/refunds` | SSR pending + 30 history + store ; filtres déjà client | — |
| `/partner/aged` | Cap 2500 + filtre client + store | — |
| `/admin/leads`, `/partner/leads` | Pagination / search serveur | Volumes unbounded |
| `/admin/aged` | Pagination serveur | Volumes aged unbounded |
| Export / auth / settings | Serveur | Sécurité / streaming |

Invalidate typique : actions partner (approve/block/delete), review refund, achat aged → `clientStore.invalidate(...)` + `router.refresh()`.

### Admin partners list (`/admin/partners`)

**Une charge SSR** (`fetchAdminPartnersRawData`, cap `ADMIN_PARTNERS_CLIENT_LOAD_LIMIT`) puis filtre statut / company, tri et pagination **côté client** (`computeAdminPartnersView`). URL via `history.replaceState` (pas de re-SSR sur changement d’onglet). Helpers : `src/lib/admin/partners-raw.ts` ; UI : `AdminPartnersView`.

| Param | Effet |
|-------|--------|
| `status` | `pending_approval` \| `active` \| `disabled` (client) |
| `company` | affiliation (client ; legacy `family` lu) |
| `sort` / `dir` | tri client |
| `page` | pagination client |

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

**Chargement** : SSR charge une fois jusqu’à `PARTNER_AGED_CLIENT_LOAD_LIMIT` (2500) leads éligibles sans filtre state/type/age/haveIul ; filtres et pagination appliqués **côté client** (pas de re-fetch SSR par changement de filtre). Paramètres URL (`state`, `type`, `age`, `haveIul`) synchronisés via `history.replaceState` pour partage. Si le pool dépasse la limite, bannière + sous-ensemble trié par `receivedAt` asc. Cache : clé `partner-aged` (`client-store`) ; invalidate / patch à l’achat.

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
| `Intent` | `intent` (stocké ; ne détermine plus `leadType`) |
| `Have_IUL`, `Primary_Goal` | `have_iul`, `primary_goal` |
| `Trusted_Form_URL` | `trustedform_cert_url` |
| `TCPA_Consent`, `TCPA_Language`, `LeadiD_Token` | colonnes homonymes |
| `SRC` | `source` ; critère fréquent pour catégories (`field=SRC`, match exact) |
| `Landing_Page`, `Sub_ID`, `Pub_ID` | tracking |
| `Unique_Identifier` | `external_id` |
| `Lead_Type` | `boberdoo_lead_type` |
| `IP_Address`, `User_Agent` | colonnes homonymes |
| Payload complet | `raw_payload` (jsonb) |

Réponse LeadConduit : `{ "outcome": "success", "reason": "" }` (chaîne vide en cas de succès).

**Note TrustedForm :** le certificat arrive dans le payload webhook (Meta → LeadConduit → plateforme). Pas besoin d'accès admin TrustedForm pour l'intake — il suffit de rediriger le webhook vers `/api/leads/intake` quand on coupe Boberdoo.

**Résolution catégorie (intake) :** `evaluateLeadCategories` (`src/lib/lead-categories/flexible-lead-categories.ts`) compare le **payload brut** aux catégories `enabled`. Tous les critères d'une catégorie doivent matcher (AND) ; une seule catégorie gagnante → `leadType` = son `type` ; zéro ou plusieurs → `status=review`, matching et Integrity ignorés. Pas de fallback `Intent` / `SRC` implicite hors critères configurés. Détail LeadConduit : [LEADCONDUIT_SETUP.md](LEADCONDUIT_SETUP.md).

---

## Catégories lead (admin)

UI : `/admin/settings` → onglet **Lead categories** (`LeadCategoryManager`). Module : `src/lib/lead-categories/flexible-lead-categories.ts`.

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/admin/lead-categories` | Liste (avec `criteria`) |
| POST | `/api/admin/lead-categories` | Création — `type` **interdit** (généré snake_case depuis `label`) ; reclassification si créée active |
| PATCH | `/api/admin/lead-categories/[id]` | `label`, `criteria`, `defaultPrice`, `enabled`, `integrityLabel` ; reclassification si `criteria` ou `enabled` change |
| DELETE | `/api/admin/lead-categories/[id]` | Refusé si des leads référencent le `type` ; sinon reclassification si la catégorie était active |

Schémas Zod : `categoryCreateSchema`, `categoryUpdateSchema`. Critères : au moins un par catégorie ; `field` unique par catégorie. `integrityLabel` alimente `lead_type_thom` à la revente Integrity.

### Reclassification après changement des règles

`reclassify-leads.ts` expose `reclassifyNonFinalizedLeads()` et réutilise exactement `evaluateLeadCategories`, comme l’intake. Le service parcourt les leads par lots de 100 à partir de `rawPayload` — y compris les leads assignés manuellement, dont les critères ont été inscrits dans ce payload — et exclut `delivered`, `integrity_posted`, `aged_listed` et `dead`.

Quand la classification change, une transaction met à jour ensemble `leadType`, `categoryResolution`, `categoryCandidateTypes`, `status` et `available`. Une résolution unique repasse le lead en `unmatched` / `available=true`, sans lancer matching ni livraison dans cette requête ; zéro ou plusieurs matchs donnent `review` / `available=false`. Chaque écriture revalide que le statut n’est pas devenu final entre la lecture et l’update, puis émet l’événement existant `reprocessed` avec `reason=category_rules_changed`. Il n’existe ni FK Lead → catégorie ni migration dédiée à ce service.

### Présentation et libellés UI

Modules : `category-presentation.ts`, `category-labels.ts`. Les libellés des catégories affichées (admin, partner, emails, filtres) viennent de la table `lead_categories`, pas de constantes IUL hardcodées. Les libellés d’anomalie sont fixes : **Unclassified** (`no_match` / `leadType` vide) et **Multiple match** (avec chips candidats libellés depuis la table) ; le filtre Type affiche **Multiple category match**. Helpers : `resolveLeadCategoryPresentation`, `loadEnabledCategoryLabels`, `buildCategoryFilterOptions`.

### Diagnostics payload (détail lead admin)

`payload-diagnostics.ts` — `buildCategoryPayloadDiagnostics` : union des champs critères des catégories actives, avec présence/valeur sur le `raw_payload` top-level. Affiché dans le détail lead admin (onglet IUL / panneau assignation).

### Assignation manuelle (review uniquement)

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/admin/leads/[id]/assign-category` | Corps `{ categoryType }` — résout un lead `status=review` avec `no_match` ou `multiple_matches` |

Module : `manual-category-assignment.ts` (`prepareManualCategoryAssignment`). Écrit les critères manquants dans `raw_payload`, synchronise colonnes intake (`map-payload-fields`), passe le lead en `unmatched` + `available=true` + `category_resolution=matched`. Émet `LeadEventType.category_assigned`. Réponse `{ success, requiresReprocess: true }` — l’admin relance le reprocess manuellement ou via cron.

UI : `admin-lead-category-assign-panel.tsx` (chips candidats + sélecteur catégorie).

### Garde-fous reprocess

`reprocess-eligibility.ts` — `getReprocessEligibility` : refuse le reprocess si `category_resolution` est `no_match` ou `multiple_matches`, si `leadType` absent, ou si lead non `unmatched`/`available`. Branché dans `reprocess-unmatched.ts`.

**Hold bulk manuel** (`reprocess-hold.ts`) : verrou en mémoire (TTL 10 min, renouvelé à chaque hold) pour éviter qu’un cron ou un reprocess ligne à ligne ne matche un lead pendant que l’admin choisit les partenaires dans le modal bulk. Le cron `reprocessUnmatchedLeads` ignore les leads tenus ; `reprocessSingleLead` sans `includePartnerIds` renvoie une erreur si le lead est tenu. Libération via `POST …/release-hold` (annulation modal) ou automatiquement dans le `finally` de `POST …/bulk-reprocess`. État **par processus Node** (pas partagé entre instances).

### Import et réparation historique

- **Import CSV** : `import-category-classification.ts` + `map-csv-row-to-lead.ts` — même `evaluateLeadCategories` qu’à l’intake ; plus de fallback Traditional/High Intent depuis `SRC` seul.
- **Script réparation** : `pnpm run repair:category-classification` (dry-run par défaut) ; `--apply` pour persister. Réévalue tous les leads non finalisés (`delivered`, `integrity_posted`, `aged_listed`, `dead` exclus).

---

## Moteur de matching V1 (actuel)

Critères d'éligibilité partner :
1. Lead `category_resolution = matched` et `lead_type` renseigné
2. `status = unmatched` et `available = true`
3. Partner `status = active`
4. `filter_states` contient l'état du lead
5. `lead_type` compatible (filter set)
6. **≥ 15 états** dans `filter_states`
7. `wallet_balance >= prix_effectif` (`price_override` ou `default_realtime_price`)

Tri : `priority DESC`, puis `created_at ASC` (FIFO).

Transaction atomique à la livraison :
- INSERT `lead_deliveries`
- UPDATE `partners.wallet_balance`
- INSERT `transactions` (type `lead_purchase`)
- UPDATE `leads` (`available=false`, `status=delivered`)

**V2 (implémenté) :** éligibilité via `partner_filter_sets` actifs avec `isTemplate=false` + limites horaires/journalières ; les lignes template sont toujours exclues ; `filterSetId` sur `lead_deliveries`. `filterCriteria.intent` / `haveIul` : allow-list (vide/absent = any) ; sentinel `"empty"` matche lead null/blank (`matchesAllowListWithEmpty`).

---

## Filter sets & templates

**CRUD partner (live sets)** : `/api/admin/partners/[id]/filter-sets` (+ `[filterSetId]`), `/api/partners/filter-sets` (+ `[filterSetId]`). Les partners ne peuvent pas poser `isTemplate`.

**Templates** (chemins inchangés ; stockage = `partner_filter_sets` où `isTemplate=true`) :

| Méthode | Route | Scope |
|---------|-------|--------|
| GET / POST | `/api/admin/filter-set-templates` | Admin |
| GET / PATCH / DELETE | `/api/admin/filter-set-templates/[id]` | Admin |
| GET | `/api/partner/filter-set-templates` | Partner (picker) |
| GET | `/api/onboarding/filter-set-templates` | Onboarding |

À l’écriture (filter sets + onboarding), `stripAttributionCriteria` retire les clés Attribution de `filterCriteria`. Le schéma `POST /api/partners/onboarding` n’accepte plus ces clés. Helpers : `src/lib/filter-sets/templates.ts`, `sanitize-criteria.ts`.

**Critères Intent / Have IUL (UI)** : multi-select ; options = valeurs distinctes sur tous les `leads` + **Empty** (`"empty"`, même token que le filtre aged Have IUL), préfetchées SSR via `getLeadFilterCriteriaOptions()` — pas de route API publique ni fetch à l’ouverture du dropdown. Composant partagé : `advanced-filters-fields.tsx`.

**Filter List** : `GET`/`PATCH` `/api/admin/filter-list` ; usage batch via `getFilterSetUsageBatch`.

---

## Auth admin

- Comptes **admin** et **partner** ont des **portails séparés** (URLs et flux Clerk distincts).
- Admin : allowlist email `ADMIN_EMAILS` → promotion automatique au login (`promote-admin.ts`).
- **Admin invite-only** : pas de signup public ; `POST /api/admin/administrators/invite` → Clerk `createInvitation` avec `redirectUrl: ${origin}/admin/sign-up` et `publicMetadata.role = admin`.
- Page acceptation : `/admin/sign-up` — `<SignUp routing="path" path="/admin/sign-up" signInUrl="/admin/sign-in" />` (ticket d'invitation ; pas de lien UI vers cette page).
- **Liste admins** : `GET /api/admin/administrators` renvoie les users `role=admin` + les invitations admin (tous statuts) avec badge de statut. **Dedupe** : les invitations `accepted` dont l’email correspond déjà à un admin actif sont masquées ; pending et **orphans** accepted (sans user) restent visibles.
- **Récupération invite** (conflit Clerk `form_identifier_exists` / `duplicate_record`) :
  1. User live non-admin (ex. partner) → `publicMetadata.role = "admin"` en place ; réponse `{ promoted: true }` (200).
  2. Déjà admin → 409 « already an administrator ».
  3. Pas de user, invitations stale → revoke puis un retry `createInvitation`.
  4. Sinon → 409 avec message de récupération.
- **Récupération orphan accepted** : `POST /api/admin/administrators/invitations/[id]/create-user` — invitation `accepted` + `publicMetadata.role === "admin"`, aucun user Clerk pour cet email → `createUser` avec `role: admin` (préfère `skipPasswordRequirement` ; fallback mot de passe aléatoire + `skipPasswordChecks`). UI : bouton « Create account » (pas revoke — Clerk ne peut pas révoquer un invite accepted).
- Logs structurés : `[admin/administrators/invite]` (conflits, promotions, revoke/retry) et `[admin/administrators/invitations/create-user]` (orphans).

### Clerk Frontend API proxy (Replit prod)

Sur `*.replit.app`, pas de CNAME Clerk → la Frontend API est proxifiée via `/api/__clerk` (`clerkMiddleware` → `frontendApiProxy`, production uniquement). Détail : [CLERK_INTEGRATION.md](CLERK_INTEGRATION.md).

**Exception — invitations :** `GET /api/__clerk/v1/tickets/accept` n'est **pas** proxifié (Cloudflare bloquait les liens → page blanche). Handler local :

| Fichier | Rôle |
|---------|------|
| `src/lib/auth/clerk-ticket-accept.ts` | Handler middleware + résolution JWT edge-safe (skip proxy) |
| `src/lib/auth/clerk-ticket-accept-server.ts` | Fallback lookup invitation Clerk (Node) |

`shouldProxyClerkFrontendApi` et route publique `CLERK_TICKET_ACCEPT_PATH` dans `src/middleware.ts`.

---

## Intégrations

| Intégration | Mode | Variables / notes |
|-------------|------|-------------------|
| Stripe wallet | test puis prod | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — valider en test avant prod |
| Resend email | optionnel | `RESEND_API_KEY`, `FROM_EMAIL` |
| CRM outbound POST | par partner (BDD) | `partner_crm_outbound_configs` — [PARTNER_CRM_OUTBOUND.md](PARTNER_CRM_OUTBOUND.md) |
| IntegrityCONNECT | prod : live ; dev : mock/live | Vendors `integrity_realtime` / `integrity_storefront` dans `resale_vendor_configs` (enabled + postUrl) ; fallback env `INTEGRITY_REALTIME_SUBMIT_URL` / `INTEGRITY_STOREFRONT_SUBMIT_URL` ; mode sorties via `getIntegrationsMode()` : **prod toujours `live`** ; en dev, `app_settings.integrations_mode` prime, env `INTEGRATIONS_MODE` seulement si pas de valeur DB (défaut `mock`). Dropdown Mode (Settings → Integrations / Integrity Connect) **PATCH immédiat** `/api/admin/settings` — pas besoin de Save du formulaire |
| Cron jobs | routes prêtes | `CRON_SECRET` (dev : défaut `dev-cron-secret` si unset) + `pnpm run verify:cron` |

---

## Stratégie jobs planifiés

Routes protégées par `Authorization: Bearer $CRON_SECRET` (en dev, le serveur accepte `dev-cron-secret` si `CRON_SECRET` est vide — voir `src/lib/cron/auth.ts`) :

| Route | Fréquence suggérée | Rôle |
|-------|-------------------|------|
| `POST /api/cron/reprocess-unmatched` | 5–15 min | Retente match < 24h ; poste Integrity au-delà |
| `POST /api/cron/integrity-post` | 15–30 min | Poste leads unmatched > 24h vers IntegrityCONNECT |

Options : `pg_cron` Supabase, Vercel Cron, cron-job.org.

Implémentation : `src/lib/jobs/reprocess-unmatched.ts`, `src/lib/integrity/*`

### Reprocess admin (manuel vs cron)

**Flux bulk UI (partner picker ON)** : clic Reprocess → `POST …/bulk-reprocess/hold` → modal → `POST …/eligible-partners` (renouvelle le hold) → confirmation → `POST …/bulk-reprocess` (libère le hold). Fermeture / annulation du modal → `POST …/release-hold`.

**Flux direct (partner picker OFF, défaut)** : clic Reprocess → `POST …/bulk-reprocess` sans `partnerIds` (match tous les partenaires éligibles, pas de modal ni hold).

Setting admin : `reprocess_partner_picker_enabled` (`app_settings`, défaut `false`) — toggle « Partner picker on reprocess » dans Settings → General → Lead lifecycle.

| Route | Body | Réponse | Comportement |
|-------|------|---------|--------------|
| `POST /api/admin/leads/bulk-reprocess/hold` | `{ leadIds: string[] }` | `{ held: number }` | Pose un hold reprocess sur les leads (validation `unmatched`+`available`). |
| `POST /api/admin/leads/bulk-reprocess/release-hold` | `{ leadIds: string[] }` | `{ released: number }` | Libère le hold (ex. modal fermé sans confirmer). |
| `POST /api/admin/leads/bulk-reprocess/eligible-partners` | `{ leadIds: string[] }` | `{ partners: [{ id, firstName, lastName, priority, matchCount }] }` | Partenaires actifs éligibles pour ≥1 lead (règles complètes filter set + limites). Renouvelle le hold. 400 si lead absent ou non `unmatched`+`available`. |
| `POST /api/admin/leads/bulk-reprocess` | `{ leadIds: string[], partnerIds?: string[] }` | `{ processed, matched, errors, unmatched }` | Reprocess manuel : `matchLead` restreint à `partnerIds` si fourni ; sinon tous les partenaires éligibles. **Pas** de fallback Integrity. Libère le hold en `finally`. |
| `POST /api/admin/leads/:id/reprocess` | — | résultat `reprocessSingleLead` | Idem mode **manual** (match only). Refusé si lead en hold bulk (sans allowlist). |

Le cron `reprocessUnmatchedLeads` conserve le fallback Integrity pour les leads au-delà du délai configuré et **ignore** les leads en hold. `matchLead` accepte `includePartnerIds` (allowlist) via `findEligibleFilterSets`.

### Admin Integrity postings

| Route | Rôle |
|-------|------|
| `GET /api/admin/integrity/postings` | Liste légère (50 derniers `resale_postings` + lead basique). **Pas** de payloads complets ; `rejectionReason` toujours `null` ici. |
| `GET /api/admin/integrity/postings/[id]` | Détail : résumé posting + événements Integrity du lead filtrés par `postingId` ; dérive `rejectionReason`, `outcome`, `requestPayload`, `response` depuis les payloads d’événements. |
| `POST /api/admin/integrity/test` | Soumission test LeadConduit sans enregistrement BDD (voir [LEADCONDUIT_SETUP.md](LEADCONDUIT_SETUP.md)). |

**Persistance événements** (`lead_events.payload`) :

- Post sortant (`src/lib/integrity/post.ts`) : `integrity_posted`, `integrity_rejected`, `integrity_missing_fields` stockent `requestPayload` et `response` (réponse LeadConduit / ping) quand disponibles, plus `postingId`.
- Webhook `POST /api/webhooks/integrity` : `integrity_accepted` / `integrity_rejected` / `integrity_error` stockent le body webhook sous `response`.
- Postings plus anciens peuvent n’avoir ni payloads ni raison de rejet (empty state UI).

UI : `/admin/integrity` — modal détail avec section collapsible « Integrity payloads & outcome » (lazy-load du détail `[id]`).

---

## Infra Supabase

| Champ | Valeur |
|-------|--------|
| Nom | FFL Capital |
| Project ref | `wbzvyvtlopoghvdqltxm` |
| Région | `eu-west-3` |
| Dashboard | https://supabase.com/dashboard/project/wbzvyvtlopoghvdqltxm |

### Connexion locale (Prisma)

Supabase dev : session pooler (port **5432**), pas le transaction pooler 6543 (transactions Prisma).

```
DATABASE_URL=postgresql://postgres.wbzvyvtlopoghvdqltxm:[PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:5432/postgres?pgbouncer=true
```

Replit prod : une seule **`DATABASE_URL`** fournie par le module PostgreSQL Replit.

### Sécurité RLS

RLS activé sur toutes les tables, **sans policies** `anon`/`authenticated` — accès serveur Next.js via Prisma uniquement.

---

## Commandes dev

```bash
pnpm install
cp .env.example .env
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm run seed
pnpm dev
pnpm run verify          # checklist backend Phase 9 (serveur dev requis)
pnpm run verify:cron     # smoke test routes cron
pnpm run test:outbound   # CRM outbound (SSRF, mapping, règles succès — sans DB)
pnpm run seed:lead       # POST fixture intake
pnpm run repair:category-classification   # dry-run réévaluation catégories (historique)
pnpm run repair:category-classification -- --apply   # applique les corrections
pnpm stripe:listen       # webhook Stripe local
```

---

## Vérification backend (Phase 9)

**Commandes :** `pnpm run verify` (`scripts/verify-backend.mjs`), `pnpm run verify:cron` (`scripts/verify-cron.mjs`). Les deux scripts résolvent l’URL API via `scripts/lib/api-base.mjs` : variable optionnelle **`API_BASE_URL`**, sinon `http://127.0.0.1:3000` en local ou `:5000` sur Replit (`REPL_ID` / `PORT`). Ils chargent **`.env`** pour `CRON_SECRET` (défaut script : `dev-cron-secret`, aligné sur le serveur en `NODE_ENV=development`).

**Préflight verify :** `GET /api/health` + présence du partner seed `tx-priority10@ffl-test.local` (`pnpm run seed` après migrations).

**Scénarios `verify` (sortie `[PASS]` + résumé final) :**

| ID | Sujet |
|----|--------|
| p9-1 | Intake payload Boberdoo → match `tx-priority10` → events received / matched / delivered |
| p9-2 | Rejet doublon email+téléphone ; idempotence `externalId` |
| prd-ca / prd-wallet / prd-states / prd-fifo | Règles matching (état, solde, ≥15 états, FIFO) |
| p9-3 | Limite **hebdomadaire** filter set → unmatched |
| p9-4 | Éligibilité aged (seuil `aged_days_threshold`) |
| p9-5 | Remboursement Type A (`wrong_filter` → unmatched) et Type B (`invalid_phone` → dead) |
| p9-6 | Recherche admin par email et téléphone |
| p9-7 | Cron `POST /api/cron/integrity-post` sur lead unmatched au-delà du délai |
| p9-8 | Persistance champs lead étendus (import / migration) |

---

## Partners de test (seed)

| Email | Rôle test |
|-------|-----------|
| `tx-priority10@ffl-test.local` | TX, filter set priorité 10 — gagne le match |
| `fifo-older@ffl-test.local` | TX, priorité 8, créé en premier (FIFO) ; seed inclut aussi un `partner_crm_outbound_configs` demo (enabled + bearer + mappings) pour prévisualiser Lead delivery sur `/partner/settings` |
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
| 2026-08-03 | Dashboard admin — presets last_month / all_time ; refetch API hors fenêtre 90 j ; Lead Intake granularité adaptative (h/j/sem/mois) |
| 2026-08-03 | Dashboard admin — donut Delivering = taux livraison (leads entrés / status delivered), plus mix canal Real-time vs Aged |
| 2026-08-03 | Lead Intake — seuils révisés (≤1 h ; 2–60 j ; 61–90 sem ; >90 mois) ; labels weekly = date début bucket |
| 2026-07-23 | Dashboard admin — charge 90j une fois, filtre période client ; URL canonique, custom modal |
| 2026-07-22 | Dashboard admin — filtre période URL + stats/graphiques/leads récents |
| 2026-07-22 | Admin aged — tableau tri URL + pagination + mark dead (UI) |
| 2026-07-23 | Phase 9 — `verify-backend` scénarios complets, `api-base.mjs`, cron dev secret, seed filter set TX priorité 10 |
| 2026-07-24 | Templates filter set unifiés dans `partner_filter_sets` (`isTemplate`) ; matching exclut les templates ; APIs `/filter-set-templates` inchangées |
| 2026-07-24 | Intent / Have IUL : multi-select + `"empty"` ; Attribution retirée de l’onboarding (aligné filter sets) ; options critères préfetch SSR |
| 2026-07-29 | Clerk Replit : handler local `tickets/accept` (fix page blanche invitations) ; admin invite → `/admin/sign-up` ; proxy FAPI skip sur ce chemin |
| 2026-08-03 | Admin invite recovery : promote user non-admin existant ; revoke+retry invitations stale ; liste admins affiche tous les statuts d'invitation |
| 2026-08-03 | Admin invite orphan recovery : `POST …/invitations/[id]/create-user` ; UI « Create account » ; dedupe accepted+admin existant |
| 2026-07-30 | Catégories lead flexibles : critères multi-champs, résolution intake (`category_resolution`), filtres vues admin, UI settings |
| 2026-07-30 | Résolution catégorie complète : libellés UI dynamiques, diagnostics payload, assignation manuelle review, garde-fous reprocess, import/réparation, événement `category_assigned` |
| 2026-07-30 | Vues leads : filtre Type admin unifié + attribution filter set ; périodes partner sur `deliveredAt` ; règles catégories → reclassification automatique des leads non finalisés |
| 2026-07-31 | Bulk reprocess : hold/release en mémoire pour éviter course cron / reprocess ligne pendant sélection partenaires ; routes `hold` et `release-hold` |
| 2026-08-04 | `getIntegrationsMode()` : en dev, `app_settings.integrations_mode` prime sur env ; Mode admin PATCH immédiat `/api/admin/settings` |
| 2026-08-04 | Admin Integrity postings : détail `GET …/postings/[id]` (payloads + timeline événements) ; `requestPayload` / `response` persistés sur événements post + webhook |
