# FFL Capital — Backend

> Journal d'implémentation backend  
> Dernière mise à jour : 10 juillet 2026

**Plan en cours :** [CORE_BACKEND_PLAN.md](CORE_BACKEND_PLAN.md) — terminer le backend core à parité Boberdoo avant la passe UI.

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
| Partner Contact Us (Resend → admin + confirmation) | ✅ `POST /api/partner/contact` |
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
| Credentials livraison (`crmProvider`, Ringy) | ✅ |
| Clés `app_settings` étendues | ✅ |
| Détection doublons + idempotence intake | ✅ |
| Validation TrustedForm (optionnelle) | ✅ |
| Matching v2 (filter sets + limites H/J) | ✅ |
| APIs admin filter-list + filter-sets CRUD | ✅ |
| APIs admin leads (search, edit, export, timeline, redeliver, delete) | ✅ |
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
| Polish UI | ⏳ après backend core |

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

**Tables actuelles :** `partners`, `partner_filter_sets`, `leads`, `lead_events`, `lead_deliveries`, `refund_requests`, `transactions`, `billing_recurrence`, `resale_postings`, `app_settings`, `migration_jobs`.

**Migrations :**
- `20250629190000_init` — schéma complet + index
- `20250629190100_enable_rls` — GIN sur `filter_states` + RLS
- `20250706190000_lead_boberdoo_fields` — champs lead étendus
- `20250710140000_core_backend_schema` — `lead_events`, `partner_filter_sets`, credentials, TrustedForm

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
| Resend email | optionnel | `RESEND_API_KEY`, `FROM_EMAIL` — livraison lead **et** Partner Contact Us ; destinataire Contact Us = `app_settings.contact_recipient_email` (défaut `support@fflcapital.com`, UI Admin → Settings → General → Platform) |
| CRM outbound POST | par partner (BDD) | `partner_crm_outbound_configs` — [PARTNER_CRM_OUTBOUND.md](PARTNER_CRM_OUTBOUND.md) |
| IntegrityCONNECT | mock/live (admin + env) | Vendors `integrity_realtime` / `integrity_storefront` dans `resale_vendor_configs` (enabled + postUrl) ; fallback env `INTEGRITY_REALTIME_SUBMIT_URL` / `INTEGRITY_STOREFRONT_SUBMIT_URL` ; **Realtime IUL** : ping Azure `IsAcceptingCampaign` avant post LC (`INTEGRITY_REALTIME_PING_URL`, `INTEGRITY_PING_VENDOR_ID`, `INTEGRITY_PING_FUNCTIONS_KEY` — env-only, jamais en BDD) ; Storefront : post direct sans ping LC ; mode sorties via `getIntegrationsMode()` : `app_settings.integrations_mode` prime, env `INTEGRATIONS_MODE` si pas de valeur DB, défaut `mock` (dev) / `live` (prod). Dropdown Mode (Settings → Integrations / Integrity Connect) visible et persistable en prod ; **PATCH immédiat** `/api/admin/settings` — pas besoin de Save du formulaire. **Mock auto posts** : HTTP réel vers LeadConduit avec `is_test=yes` (`applyIntegrityAutoPostTestFlag`) ; ping Azure Realtime IUL skippé (auto-accept). Live auto posts ne forcent pas `is_test`. **Boberdoo parity** : posts auto toujours HTTP — pas de gate local `required-fields.ts` ; rejets LC → `integrity_rejected` avec body LC. `required-fields.ts` = avertissements admin seulement. Boutons admin test : toujours HTTP réel + `is_test=yes` (mock et live) |
| Cron jobs | routes prêtes | `CRON_SECRET` (dev : défaut `dev-cron-secret` si unset) + `pnpm run verify:cron` |

---

## Stratégie jobs planifiés

Routes protégées par `Authorization: Bearer $CRON_SECRET` :

| Route | Fréquence suggérée | Rôle |
|-------|-------------------|------|
| `POST /api/cron/reprocess-unmatched` | 5–15 min | Retente match < 24h ; poste Integrity au-delà |
| `POST /api/cron/integrity-post` | 15–30 min | Poste leads unmatched > 24h vers IntegrityCONNECT |

Options : `pg_cron` Supabase, Vercel Cron, cron-job.org.

Implémentation : `src/lib/jobs/reprocess-unmatched.ts`, `src/lib/lead-routing/coordinator.ts`, `src/lib/integrity/*`

### Lead routing (lifecycle Phase 2)

Module `src/lib/lead-routing/` — policy pure (`policy.ts`), exécution (`coordinator.ts`), verrou vente live (`live-sale.ts`).

**Flag admin** (`app_settings`, défaut **off**) : `lifecycle_routing_enabled`. Settings associés : `lifecycle_realtime_cutoff_hours` (24), `lifecycle_storefront_cutoff_hours` (48), `lifecycle_mid_window_primary` (`partner` \| `storefront`). UI : Settings → General → Lead lifecycle.

Quand **désactivé** (comportement legacy) : reprocess cron matche pendant `integrity_post_delay_hours`, puis post Integrity **realtime** par défaut.

Quand **activé** (cycle client approuvé — voir `docs/client_email_lead_routing_2026-08-03.txt`) :

| Âge lead | Phase | Action automatique |
|----------|-------|-------------------|
| 0 – cutoff Realtime (24 h) | `realtime` | Post Integrity Realtime uniquement (pas de match partner) |
| Realtime – cutoff Storefront (48 h) | `partner_or_storefront` | Route primaire + fallback selon `lifecycle_mid_window_primary` ; posting Integrity `pending` bloque le fallback |
| Storefront – seuil aged (30 j) | `partners_only` | Match partners uniquement |
| ≥ seuil aged | `aged_marketplace` | Pas de routage live auto (marketplace passive) |
| `live_sold_at` renseigné | `live_sold` | Aucun routage live auto |

`executeLeadRouting` est appelé depuis l'intake (après catégorie OK), le cron `reprocess-unmatched` / `integrity-post`, et le reprocess manuel. Preview sans effet de bord : `POST /api/admin/lead-routing/preview` — corps `{ ageHours, liveSold, integrityPosting }`.

**Preflight Azure** (secrets env, sortie redacted) : `pnpm run preflight:integrity-azure`

### Reprocess admin (manuel vs cron)

**Flux bulk UI (partner picker ON)** : clic Reprocess → `POST …/bulk-reprocess/hold` → modal → `POST …/eligible-partners` (renouvelle le hold) → confirmation → `POST …/bulk-reprocess` (libère le hold). Fermeture / annulation du modal → `POST …/release-hold`.

**Flux direct (partner picker OFF, défaut)** : clic Reprocess → `POST …/bulk-reprocess` sans `partnerIds` (match tous les partenaires éligibles, pas de modal ni hold).

Setting admin : `reprocess_partner_picker_enabled` (`app_settings`, défaut `false`) — toggle « Partner picker on reprocess » dans Settings → General → Lead lifecycle.

### Partner Contact Us

UI : `/partner/contact` — formulaire topic + message → `POST /api/partner/contact` (plus de `mailto:` client).

| Route | Auth | Body | Réponse |
|-------|------|------|---------|
| `POST /api/partner/contact` | `requirePartner` | `{ topic, message, customTopic? }` (Zod `partnerContactSchema` ; topics fermés dans `contact-topics.ts` ; si `topic === "other"`, `customTopic` requis 1–120 car.) | `200` `{ ok, confirmationSent, warning? }` ; `400` payload ; `403` auth ; `502` échec envoi admin |

Flux (`deliverPartnerContact`) :

1. Destinataire admin via `getContactRecipientEmail()` (`app_settings.contact_recipient_email`, fallback `support@fflcapital.com`)
2. Email admin Resend (`FROM_EMAIL`, `replyTo` = email session partner) — sujet `[Partner Portal] {topic label}` ; label = `customTopic` si topic `other`
3. Confirmation partner Resend — recap topic + message ; footer « do not reply » avec email partner ; échec confirmation → succès avec `warning` ; échec admin → `502` message générique

Helper partagé : `src/lib/email/send-resend-email.ts`. Setting PATCH via `/api/admin/settings` (`contactRecipientEmail`). Tests : `test/current/partner-contact-delivery.test.ts`.

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
| `POST /api/admin/integrity/test` | Soumission test LeadConduit sans enregistrement BDD ; toujours `is_test=yes` + HTTP réel vers LeadConduit (mock et live) ; résout le label Realtime vs Storefront ; `checkRequiredIntegrityFields` = avertissements lead picker seulement ; renvoie `encodedBody` / `encodedFields` pour vérifier `address_1` et les champs DOB (voir [LEADCONDUIT_SETUP.md](LEADCONDUIT_SETUP.md)). |

**Persistance événements** (`lead_events.payload`) :

- Post sortant (`src/lib/integrity/post.ts`) : `integrity_posted`, `integrity_rejected` stockent `requestPayload` et `response` (réponse LeadConduit / ping) quand disponibles, plus `postingId`. Anciens événements `integrity_missing_fields` possibles (gate local retiré).
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
| 2026-08-05 | Phase 2 integrity-prod-alignment : module `lead-routing`, lifecycle flag off par défaut, provenance `live_sold_at` / `live_sale_channel`, Azure ping Realtime IUL, storefront sans ping LC, preflight + preview API |
| 2026-08-05 | Mock Integrity auto posts : HTTP LeadConduit réel avec `is_test=yes` ; ping Azure skippé en mock ; admin test reste short-circuit mock |
| 2026-08-05 | `getIntegrationsMode()` : résolution unifiée DB → env → défaut (mock dev / live prod) ; Mode admin visible et persistable en prod |
| 2026-08-05 | `pnpm run ensure:integrity-env` : defaults Integrity publics (URLs + VendorId) dans `.env` après pull ; clé Azure jamais commitée ; branché sur `scripts/post-merge.sh` |
| 2026-08-06 | Boberdoo parity Integrity : posts toujours HTTP (pas de gate `required-fields`) ; rejets LC → `integrity_rejected` ; admin test toujours HTTP + `is_test=yes` ; payload DOB/`has_iul_thom` aligné Boberdoo |
| 2026-08-05 | Partner Contact Us : `POST /api/partner/contact` via Resend ; setting `contact_recipient_email` (Admin Settings → General → Platform) ; plus de `mailto:` |
