# Core Backend Completion Plan

> **Objectif :** terminer le backend core à parité Boberdoo avant la passe UI/design.  
> **Statut :** implémenté (10 juillet 2026)
> **Dernière mise à jour :** 10 juillet 2026

**Documents liés :**
- [BACKEND.md](BACKEND.md) — état actuel + architecture
- [BOBERDOO_GAP_ANALYSIS.md](BOBERDOO_GAP_ANALYSIS.md) — inventaire écarts Boberdoo
- [update_call_6-7](update_call_6-7) — transcript démo client + débrief équipe (6 juil.)

---

## Périmètre

### Inclus

Tous les écarts backend identifiés lors de l’audit, alignés sur la parité Boberdoo :

- Champs lead complets (intake Boberdoo)
- Journal d’événements lead (`lead_events`)
- **Filter sets multiples** par partner (comme Boberdoo)
- Limites horaires / journalières par filter set
- Détection doublons + idempotence intake
- Validation TrustedForm (certificat dans le payload)
- APIs admin : recherche, export, édition, timeline, remboursements bulk
- Livraison Ringy + credentials partner
- IntegrityCONNECT (préparation live — mock aujourd’hui)
- Seuil aged configurable (ex. 25 ou 30 jours)
- Config admin : lead types, sources/vendors, revente
- Cron prod + vérification Stripe test

### Exclu (décisions 10 juil. 2026)

| Sujet | Décision |
|-------|----------|
| Auto-recharge au seuil de solde | **Reporté** — garder l’abonnement Stripe hebdomadaire actuel |
| Promotion partner → admin | **Non** — comptes admin et partner séparés (Clerk + `ADMIN_EMAILS`) |
| IntegrityCONNECT live | **Bloqué** sur les specs/API client (Sami) — code prêt en mode mock |
| Polish UI / design | **Après** le backend core |
| Twilio SMS | Vide dans Boberdoo aujourd’hui — hors scope |
| UI multi lead-types (IUL2, MP, Veteran) | Config stockable ; matching IUL seulement pour l’instant |

---

## État actuel (baseline)

Le happy path fonctionne en dev :

```
LeadConduit / feeding-platform / simulateur
        → POST /api/leads/intake
        → matchLead (état + priorité + FIFO + wallet)
        → deliverLead (email Resend + webhook CRM)
        → wallet ledger

Si unmatched → cron reprocess (< 24h retry match, > 24h Integrity post)
Aged → eligible après N jours (30 en dur aujourd’hui) → achat marketplace
Refunds → Type A (rematch) / Type B (lead mort)
```

**Déjà implémenté (juillet 2026) :** auth Clerk, onboarding, approbation admin, wallet Stripe (top-up + auto-recharge hebdo), remboursements, marketplace aged (logique), migration CSV, cron routes, Integrity mock, delivery email/CRM.

**Travail en cours (non commité) :** migration champs Boberdoo étendus sur `leads` + intake/delivery payload.

---

## Phases d’implémentation

### Phase 1 — Schéma

1. **Finaliser champs lead Boberdoo** — migration `20250706190000_lead_boberdoo_fields`, feeding-platform, simulateur, import migration
2. **Table `lead_events`** — audit log (received, matched, delivered, refunded, integrity_posted, duplicate_rejected, etc.)
3. **Table `partner_filter_sets`** — critères matching multiples par partner
4. **Credentials livraison** — `crmProvider`, `ringySid`, `ringyAuthToken` sur partner
5. **Clés `app_settings` étendues** — `aged_days_threshold`, validation TF, doublons, configs lead type / source / revente

**Migration filter sets :** backfill un filter set actif par partner existant depuis `filterStates`, `leadType`, `priority`, `priceOverride`. Le matching bascule sur les filter sets ; champs plats sur `Partner` conservés temporairement.

### Phase 2 — Intake

- Détection doublons (`externalId`, email+phone sur fenêtre configurable)
- Validation TrustedForm (HEAD/GET cert URL)
- Idempotence : retry LeadConduit sur `Unique_Identifier` déjà traité → success sans double création
- Statut `review` sur lead si TF invalide (mode strict)

### Phase 3 — Matching v2

- Éligibilité via **filter sets actifs** (plus le profil plat)
- Limites horaires / journalières par filter set
- `filterSetId` sur `lead_deliveries`
- APIs : `GET /api/admin/filter-list`, CRUD `/api/admin/partners/[id]/filter-sets`
- Onboarding crée le premier filter set

### Phase 4 — APIs cycle de vie lead

| Route | Rôle |
|-------|------|
| `GET /api/admin/leads/search?q=` | Recherche ID, externalId, email, phone |
| `PATCH /api/admin/leads/[id]` | Édition admin |
| `POST /api/admin/leads/[id]/refund` | Remboursement initié admin |
| `POST /api/admin/leads/[id]/redeliver` | Redelivery forcée |
| `DELETE /api/admin/leads/[id]` | Suppression / marquer `dead` |
| `GET /api/admin/leads/export` | Export CSV |
| `GET /api/admin/leads/[id]/events` | Timeline (Show Lead Log) |

### Phase 5 — Remboursements

- `POST /api/admin/refunds/bulk` — approbation multiple
- `POST /api/refunds/bulk` — demande partner multiple
- Vérifier Type A (rematch, `refundable=false` après revente) et Type B (`dead`)

### Phase 6 — Livraison

- Driver Ringy (`src/lib/delivery/ringy.ts`) — mapping BOBERDOO_EXPLORATION §38
- Log des tentatives de livraison dans `lead_events`

### Phase 7 — IntegrityCONNECT

- `src/lib/integrity/build-payload.ts` — payload complet
- Mode `storefront` en plus de `realtime`
- Env : `INTEGRITY_PING_URL`, `INTEGRITY_POST_URL`, `integrations_mode=live`
- **En attente :** URLs et format exact fournis par le client

### Phase 8 — Config + cron + Stripe

- Seuil aged depuis settings (remplace `AGED_DAYS = 30` en dur)
- Extension `PATCH /api/admin/settings`
- `scripts/verify-cron.mjs` + doc scheduler prod
- E2E Stripe **test keys** avant prod

### Phase 9 — Vérification

Étendre `scripts/verify-backend.mjs` :

1. Intake payload complet → match → events
2. Rejet doublon
3. Limite hebdomadaire filter set
4. Achat aged (lead backdaté)
5. Refund A + B
6. Recherche admin
7. Integrity mock post 24h
8. Import migration champs étendus

---

## Ordre recommandé

```
Phase 1 (schéma)
    → Phase 2 (intake) + Phase 3 (matching v2)
    → Phase 4 (lead APIs)
    → Phase 5 (refunds) + Phase 6 (delivery)
    → Phase 7 (Integrity prep)
    → Phase 8 (config/cron/Stripe)
    → Phase 9 (verify)
```

Les filter sets touchent matching, pricing et admin — le schéma doit passer en premier.

---

## Fichiers principaux

| Zone | Fichiers |
|------|----------|
| Schéma | `prisma/schema.prisma`, migrations |
| Intake | `src/lib/intake/*`, `src/app/api/leads/intake/route.ts` |
| Matching | `src/lib/matching/*` |
| Delivery | `src/lib/delivery/*` |
| Admin APIs | `src/app/api/admin/*` |
| Settings | `src/lib/settings/app-settings.ts` |
| Jobs | `src/lib/jobs/reprocess-unmatched.ts`, `src/lib/integrity/*` |

---

## Checklist de suivi

- [x] Phase 1 — Schéma
- [x] Phase 2 — Intake
- [x] Phase 3 — Matching v2
- [x] Phase 4 — Lead APIs
- [x] Phase 5 — Refunds
- [x] Phase 6 — Delivery
- [x] Phase 7 — Integrity prep
- [x] Phase 8 — Config + cron + Stripe test
- [x] Phase 9 — Verification
