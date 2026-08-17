# PRD — Plateforme de distribution de leads FFL Capital

> **Document de spécification produit** — point de départ pour l’implémentation.  
> Public : développeurs, collègues TECHMA, agents IA.  
> **Pas de code** — explications structurées uniquement.  
> Version : 1.2 — 29 juin 2026 (décisions équipe Bill)

**Documents liés :**
- `docs/PROJECT.md` — mémoire projet / décisions / FAQ
- `docs/PARTNER_CRM_OUTBOUND.md` — livraison CRM POST self-service (implémenté juil. 2026)
- `docs/TECHMA - Lead Distribution Platform Proposal.md` — scope contractuel client
- `first review with client` — transcript call review #1 (29 juin 2026, Sami Esquivias)

---

## Table des matières

1. [Vision & objectifs](#1-vision--objectifs)
2. [Utilisateurs & rôles](#2-utilisateurs--rôles)
3. [Stack technique & déploiement](#3-stack-technique--déploiement)
4. [Architecture applicative](#4-architecture-applicative)
5. [Fonctionnalités détaillées](#5-fonctionnalités-détaillées)
6. [User flows](#6-user-flows)
7. [Règles métier](#7-règles-métier)
8. [Schéma de base de données](#8-schéma-de-base-de-données)
9. [Intégrations externes](#9-intégrations-externes)
10. [Stratégie de tests & mocks](#10-stratégie-de-tests--mocks)
11. [Design & UX](#11-design--ux)
12. [Phases de livraison](#12-phases-de-livraison)
13. [Hors scope V1](#13-hors-scope-v1)
14. [Décisions figées](#14-décisions-figées)
15. [Questions ouvertes](#15-questions-ouvertes)

---

## 1. Vision & objectifs

### Contexte

FFL Capital (cliente Integrity Marketing) génère des **leads IUL** (assurance vie) via **Meta Ads** (~500/jour). Aujourd’hui, la distribution passe par **Boberdoo** : matching par état, priorité, wallet Stripe, revente **IntegrityCONNECT**.

**Limites Boberdoo** qui motivent le build :
- Impossible de gérer correctement les **aged leads** (30+ jours) en self-service
- Processus manuel : export, réimport, construction de commandes à la main
- Interface vieillotte

### Objectif produit

Construire une **plateforme web propriétaire** (usage interne client, **pas un SaaS**) qui :

1. **Réplique** le fonctionnel Boberdoo (intake, matching, wallet, revente, portails)
2. **Ajoute** une marketplace **aged leads** en self-service (innovation principale)
3. Offre un **design moderne** aligné sur la charte Integrity

### Critères de succès

- Un lead Meta → livré à un agent actif **sans intervention admin** (flux normal)
- Un agent achète des aged leads **depuis son portail** sans email à l’admin
- L’admin supervise, configure, rembourse — ne reconstruit plus de commandes à la main
- Migration historique Boberdoo **possible** (feature livrée même si exécutée plus tard)

### Contraintes projet

| Contrainte | Valeur |
|------------|--------|
| Budget client | 5 000 USD |
| Délai indicatif | 4–6 semaines |
| Cliente | Non technique — pas de questions JSON / API |
| Domaine | **Mono-domaine** unique pour tous les agents |

---

## 2. Utilisateurs & rôles

### Acteurs hors plateforme

| Acteur | Interaction |
|--------|-------------|
| **Prospect** | Remplit formulaire Meta — ne se connecte jamais à notre app |
| **LeadConduit / TrustedForm** | Envoient le lead + certificat via webhook |
| **IntegrityCONNECT** | Acheteur externe de leads non distribués en interne |
| **Stripe** | Encaisse les recharges wallet |

### Rôles dans l’application

#### Admin (opérateur cliente)

- Contrôle total : agents, leads, prix, priorités, remboursements, revente
- Rôle **superviseur** : le flux normal ne requiert aucune action
- Un ou quelques utilisateurs internes FFL Capital
- Comptes admin **invite-only** (invitation Clerk par un super-admin — pas de signup public ; voir [CLERK_INTEGRATION.md](CLERK_INTEGRATION.md))

#### Partner (acheteur de leads)

> **Vocabulaire UI** : utiliser **« Partner »** partout (parité Boberdoo). En code Prisma : modèle `Partner` (table `partners`). Ne pas afficher « Agent » à l’utilisateur.

- Personne physique, **un compte = une personne** (pas de compte partagé par agence)
- Champ texte **affiliation** : nom de l’agence / company pour laquelle il travaille
- Self-service : wallet, leads reçus, achat aged leads, config CRM

### Matrice des permissions

| Action | Admin | Agent |
|--------|:-----:|:-----:|
| Voir tous les leads | ✓ | — |
| Voir ses propres leads | ✓ | ✓ |
| Gérer agents (CRUD, priorité, prix) | ✓ | — |
| Approuver inscription agent | ✓ | — |
| Recharger wallet | — | ✓ |
| Recevoir leads temps réel (auto) | — | ✓ |
| Acheter aged leads | — | ✓ |
| Demander remboursement | — | ✓ |
| Approuver remboursement | ✓ | — |
| Config globale (prix aged, etc.) | ✓ | — |
| Migration historique | ✓ | — |
| Lancer import Boberdoo | ✓ | — |

---

## 3. Stack technique & déploiement

### Philosophie

- **PostgreSQL standard** partout — pas de lock-in Supabase Auth / Realtime
- **Auth externe** (Clerk) — portable vers Replit
- **ORM avec migrations** — switch BDD = changer `DATABASE_URL`
- **Mode mock/live** pour toutes les intégrations sortantes

### Stack retenue (décision équipe, 29 juin)

| Couche | Choix | Justification |
|--------|-------|---------------|
| **IDE / dev** | Cursor | Décision équipe |
| **Framework** | **Next.js 14** (App Router) + TypeScript | Monorepo full-stack : API webhooks + UI ; déploiement fluide Netlify → Replit |
| **UI** | **Tailwind CSS + shadcn/ui** | Composants accessibles, charte Integrity customisable |
| **ORM** | **Prisma** + migrations | Choix équipe ; DX familière, migrations versionnées |
| **Base de données** | **Supabase PostgreSQL** (dev + staging) | Pas de Docker local ; Postgres standard portable |
| **Auth** | **Clerk** | Rôles admin/partner, signup, approbation ; indépendant de Supabase |
| **Paiements** | **Stripe** mode test d’abord | Clés prod client plus tard — hors priorité immédiate |
| **Emails** | **Resend** (ou SendGrid) | Notifications lead livré |
| **Jobs planifiés** | Supabase **pg_cron** *ou* cron externe (cron-job.org) | Retraitement 24 h, aging 30 jours |
| **Repo** | GitHub | CI, collaboration |
| **Phase 1 deploy** | **Netlify** (Next.js) + **Supabase** | Preview PR, webhooks staging |
| **Phase 2 deploy** | **Replit** + Postgres Replit | Hébergement final client ; `DATABASE_URL` + Prisma migrate |

*Anciennes options écartées : Drizzle (→ Prisma), Docker Postgres local (→ Supabase), Vite+Hono séparé (→ Next.js unifié).*

### Parcours de déploiement

```
Phase A — Développement (Cursor + Supabase)
  ├── Supabase projet dev (pas Docker)
  ├── Clerk dev instance
  ├── Stripe test keys (compte TECHMA) — plus tard
  └── INTEGRATIONS_MODE=mock

Phase B — Staging (Netlify + Supabase)
  ├── Preview deploys sur chaque PR
  ├── Supabase projet staging
  ├── Webhooks LeadConduit → URL Netlify staging (ngrok si besoin en local)
  └── Stripe test

Phase C — Production initiale (Netlify + Supabase)
  ├── Domaine mono-domaine client
  ├── Supabase prod OU migration données
  └── Stripe prod client

Phase D — Migration Replit (livraison client)
  ├── Import repo GitHub dans Replit
  ├── Replit PostgreSQL — export/import depuis Supabase (pg_dump)
  ├── Variables d’env Replit
  ├── Reconfig webhooks LeadConduit + Stripe → URL Replit
  └── Netlify désactivé ou gardé en backup selon choix client
```

### Variables d’environnement clés

| Variable | Usage |
|----------|-------|
| `DATABASE_URL` | Postgres (Supabase → Replit) |
| `CLERK_*` | Auth |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Paiements |
| `RESEND_API_KEY` | Emails (livraison lead + Partner Contact Us) |
| `FROM_EMAIL` | Expéditeur Resend (requis pour Contact Us et livraisons) |
| `INTEGRATIONS_MODE` | `mock` \| `live` — fallback si `app_settings.integrations_mode` absent ; admin Mode (Integrations) prime et se sauvegarde immédiatement (prod inclus) ; défaut `mock` en dev, `live` en prod |
| `INTEGRITY_REALTIME_SUBMIT_URL` / `INTEGRITY_STOREFRONT_SUBMIT_URL` | URLs de soumission directe LeadConduit |
| `ADMIN_APPROVAL_REQUIRED` | `true` par défaut — désactivable |

### Ce qu’on n’utilise PAS volontairement

- Supabase Auth (Clerk à la place)
- Supabase Realtime / Storage (sauf si besoin futur fichiers)
- Stripe Connect (pas de marketplace multi-vendeur)
- Meta API directe (LeadConduit fait le pont)

---

## 4. Architecture applicative

### Vue d’ensemble

```
                    ┌─────────────────┐
                    │   Meta Lead Ads  │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │   LeadConduit    │
                    │  + TrustedForm   │
                    └────────┬────────┘
                             │ POST webhook
                             ▼
┌──────────────────────────────────────────────────────────┐
│              PLATEFORME FFL CAPITAL                       │
│                                                          │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │ Portail     │    │ Moteur       │    │ Portail    │ │
│  │ Admin       │◄──►│ matching +   │◄──►│ Agent      │ │
│  │             │    │ aging + jobs │    │            │ │
│  └─────────────┘    └──────┬───────┘    └────────────┘ │
│                            │                             │
│                     ┌──────┴───────┐                     │
│                     │  PostgreSQL  │                     │
│                     └──────────────┘                     │
└──────────────────────────┬───────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌──────────┐     ┌────────────┐    ┌──────────┐
   │  Stripe  │     │ Integrity  │    │ CRM agent│
   │  wallet  │     │ CONNECT    │    │ webhooks │
   └──────────┘     └────────────┘    └──────────┘
```

### Modules logiciels

| Module | Responsabilité |
|--------|----------------|
| **Auth & onboarding** | Clerk, rôles, approbation admin, profil agent |
| **Lead intake** | Webhook LeadConduit, validation, persistance |
| **Matching engine** | Routage temps réel état + type + priorité + wallet |
| **Wallet & billing** | Stripe top-up, ledger, statut actif |
| **Aged marketplace** | Listing J+30, filtres, achat unitaire + checkboxes |
| **Refund workflow** | Demande agent → validation admin → routage post-remboursement |
| **Resale** | Posts directs LeadConduit Realtime/Storefront, réconciliation |
| **Notifications** | Email lead livré ; alertes admin optionnelles |
| **CRM delivery** | POST JSON optionnel par partner (endpoint + auth + mapping) — voir [PARTNER_CRM_OUTBOUND.md](PARTNER_CRM_OUTBOUND.md) |
| **Migration** | Import leads/agents depuis export Boberdoo |
| **Admin config** | Prix globaux, frais (futur), feature flags |

---

## 5. Fonctionnalités détaillées

### 5.1 Authentification & inscription agent

**Comportement validé (call review #1, 29 juin)** : approbation admin obligatoire avant réception de leads — comme Boberdoo aujourd’hui. Désactivable via `ADMIN_APPROVAL_REQUIRED=false` si la cliente change d’avis.

**Flow cible (auth → onboarding → activation) :**
1. Agent accède à la page signup publique (Clerk)
2. Crée son compte (email + mot de passe — géré par Clerk, **pas d’email identifiants maison**)
3. **Accès immédiat au portail** en statut `pending_approval` / non actif :
   - Peut voir dashboard, « Mes leads », ajouter une carte Stripe
   - **Ne peut pas** être débité ni recevoir de leads
   - Peut contacter l’admin via l’app (« activez-moi ») — **Contact Us** `/partner/contact` → email Resend (plus de `mailto:`)
4. Agent complète **onboarding** (formulaire post-signup) :
   - Nom, affiliation (texte), état de résidence
   - Type lead : Traditional IUL ou High-Intent IUL
   - Sélection des états US ciblés
5. Admin approuve et passe l’agent **actif** ; refuse → `rejected`
6. Agent actif peut **modifier ses états** dans les paramètres du portail (amélioration vs Boberdoo)
7. Agent recharge wallet (manuel ou récurrent)
8. Agent **éligible** au matching quand : `status=active` + **≥ 15 états** sélectionnés + `wallet_balance ≥ prix_effectif`

**Filtres agent V1 :** **sélection d’états uniquement**. Le filtre « heure de réception » présent sur l’ancien formulaire Boberdoo n’est **plus utilisé** (confirmé cliente).

### 5.2 Portail admin

#### Dashboard
- Vue synthèse (Operations Dashboard) : KPIs leads/livraisons sur la période choisie (aujourd’hui, hier, 7 derniers jours, mois dernier, all time, plage custom via sélecteur calendrier ou URL `period=…&from&to`), titres KPI/graphiques selon la période ; graphique Lead Intake à granularité adaptative (horaire / journalier / semaines glissantes / mensuel selon la durée de plage) et donut Delivering (taux de livraison parmi les leads entrés sur la période : Delivered = `delivered` ou `integrity_posted` vs Not delivered, centre %), leads récents ; compteurs agents actifs et file unmatched (état courant) ; données hors fenêtre 90 j rechargées serveur
- Alertes optionnelles (pics unmatched)

#### Gestion agents
- Liste tous les agents : statut, priorité, solde, états, type lead
- Actions : approuver/rejeter inscription, activer/désactiver, modifier priorité (1–10), prix personnalisé, voir historique

#### Gestion leads
- Liste tous les leads avec vues sauvegardées : statut, état, date de réception, Type multi-select (catégories + Unclassified + Multiple category match) et attribution à un filter set live. L’éditeur peut **Apply** un brouillon sans le persister ; la liste l’utilise immédiatement, l’éditeur se ferme, et une action **Save view** reste visible jusqu’à l’enregistrement.
- Un type sélectionné inclut les leads résolus dans ce type et les leads à matchs multiples où ce type est candidat ; plusieurs types sont combinés en OR
- Badge statut `integrity_posted` = **Integrity** seul ; destination RealTime/Storefront via `resolveIntegrityLiveSaleChannel` (`liveSaleChannel`, sinon `mode` du dernier posting Integrity) affichée en colonne Partner **uniquement** quand le lead est vendu Integrity (`integrity_posted`) via `formatAdminLeadPartnerLabel` → **RealTime** / **Storefront**, sinon nom partenaire ; le filtre de vue « Integrity » (`integrity_posted`) reste unique
- Détail lead : contact, TrustedForm cert, historique deliveries, **même badge statut Integrity** (plain, sans Realtime/Storefront) ; les leads unmatched avec rejet métier terminal `integrity_rejected` (hors NCA et échec opérationnel) affichent **Integrity - Rejected** sur liste/détail ; Tracking (phase routage, last/next attempt, champs legacy de bloc Integrity en audit) ; **diagnostics payload** (champs critères catégories) ; section **Other fields** (libellés/valeurs lisibles depuis `rawPayload`, hors champs déjà affichés dans Contact/IUL/Compliance/Tracking) + collapsible **Raw Payload** (audit JSON) ; libellés d’anomalie fixes **Unclassified** / **Multiple match**, avec libellés des catégories candidates depuis la table
- Actions manuelles : reprocesser (allowlist partners si Partner actif ; pas de fallback Storefront), **assigner une catégorie** (leads `review` non résolus uniquement), voir file unmatched

#### Remboursements
- File des `refund_requests` en attente (écran « Approve Refunds », parité Boberdoo)
- Admin **vérifie** la demande (ex. appeler le numéro pour confirmer hors service)
- Approuver → crédit wallet + routage selon **type de remboursement** (voir §5.8 et §7)
- Refuser → notification agent
- Suivi optionnel du **buffer 15 %** sur remboursements « numéro invalide » (voir §7)

#### Configuration globale
- Prix lead temps réel par type (défaut IUL = 25 $)
- **Aged price tiers** (`/admin/settings` → table éditable `aged_price_tiers`) : bandes `{ minDays, maxDays|null, price }` — pricing marketplace + cooldown revente ; défauts 30–60@$5, 61–90@$4, 91–180@$3, 181–365@$2, 366+@$1 ; seuil marketplace = `minDays` du 1ᵉʳ tier (sync `aged_days_threshold`) ; `default_aged_price` = fallback hors bande seulement
- **Catégories lead** (`/admin/settings` → Lead categories) : label admin, critères multi-champs (match exact sur payload), `integrity_label` (Realtime) + `integrity_label_storefront` (Storefront, fallback Realtime), prix par défaut ; clé interne `type` générée (non éditable). Créer/supprimer une catégorie active ou modifier ses critères/état enabled réévalue automatiquement les leads non finalisés avec les mêmes règles que l’intake
- **Destinataire Contact Us partner** (`/admin/settings` → General → Platform) : `contact_recipient_email` (défaut `sami@ffl-capital.com`)
- **Lead routing** (`/admin/settings` → Lead routing) : mode Partner-only vs lifecycle ; fenêtres 24 h / 48 h / mid-window primary ; automation partners 48 h–30 j ; partner picker reprocess ; intake (TrustedForm / doublons)
- *(Futur)* frais de retraitement

#### Migration historique
- Écran import : upload export Boberdoo (CSV/API selon format découvert), par sélection ou glisser-déposer ; le nom du fichier sélectionné et les volumes détectés restent visibles avant de continuer
- Catalogue global des champs `Lead` pour auto-détecter les alias ; les champs système protégés sont identifiés dans le mapping et ne sont pas modifiables par l’import manuel
- Mapping champs manuel pour les CSV classiques, puis preview des cinq premières lignes avant confirmation
- Les exports full-fidelity sont détectés automatiquement via `id` + `raw_payload` ; l’interface affiche aussi l’étape **Map Columns** avec les mappings automatiques préremplis (boutons d’étape **Next**) avant le preview, mais l’import conserve son traitement dédié sans appliquer ce mapping ; `id` / statut / dates / `category_resolution` optionnels (dérivés si absents), `raw_payload` ou `lead_type` requis par ligne
- Import batch avec rapport erreurs par ligne
- **Feature livrée en V1** même si exécution différée

#### Revente Integrity
- Vue postings (`/admin/integrity`) : statut, mode realtime/storefront ; modal détail avec outcome, payloads request/response et timeline d’événements Integrity (lazy-load détail API) ; badge **Sold** (vert) sur succès ; badge distinct **No Campaign Available** (jaune) pour `no_campaign_available`
- **Reprocess** admin depuis le modal : envoi immédiat `POST /api/admin/integrity/postings/[id]/reprocess` (loading sur le bouton ; succès ferme le modal ; erreur toast + modal ouvert) ; mode verrouillé (Realtime ou Storefront) ; interdit si vente live (`liveSoldAt`) ou posting `sold`
- Modal partagé **Review payload** (`IntegrityPayloadEditModal`) : Connection test uniquement
- Raison de rejet dérivée des lead events quand disponibles (postings anciens : empty state)
- Réconciliation storefront (import log journalier — manuel ou auto selon API) ; webhook `success` idempotent si déjà sold au submit sync

### 5.3 Portail agent

#### Dashboard
- Solde wallet, statut actif/inactif
- Leads reçus récemment
- Lien rapide marketplace aged

#### Mes leads
- Liste des leads livrés (temps réel + aged achetés)
- Vues sauvegardées avec périodes today / yesterday / 7 derniers jours / mois dernier / custom, appliquées à la date de livraison ; un brouillon appliqué reste disponible à la réouverture de l’éditeur et ne devient persistant qu’avec **Save view**
- Détail : contact, état, date, prix payé, certificat TrustedForm ; section **Other fields** (mêmes lignes lisibles depuis `rawPayload` que l’admin — pas de dump JSON brut)
- Bouton **Mark as sold** sur la **1ʳᵉ** livraison aged (≤ 7 j depuis la livraison, non remboursée) ; badge **Marked sold** une fois confirmé — retire le lead de la marketplace sans 2ᵉ vente
- Bouton **demander remboursement** (si delivery `refundable`)

#### Wallet
- Solde en temps réel
- **Recharge manuelle** : montant libre
- **Recharge récurrente** : ex. 500 $/semaine, carte enregistrée
- Historique transactions (pas de PDF facture obligatoire V1)

#### Marketplace aged leads
- Filtres **UI** (optionnels, multi-select) : états, types IUL, tranches d’âge (clés `String(tier.minDays)` depuis `aged_price_tiers` ; URL comma-séparées ; OR dans une dimension, AND entre dimensions ; vide = tous) — **pas** de filtre Have IUL, **pas** de restriction par filter set ni par `lead_type` compte
- Liste : même éligibilité que admin (âge ≥ seuil 1ᵉʳ tier, `status != dead`) ; **pas** de condition `available = true` ; **prix affiché par lead** selon la tranche
- **Achat unitaire** : bouton acheter sur une ligne
- **Sélection multiple** : checkboxes + « Acheter la sélection »
- Débit wallet, livraison email + CRM
- *(V2)* panier persistant

#### Paramètres
- Layout Settings : Profile + **Lead delivery** (demi/demi) ; filter sets en dessous
- CRM outbound : carte Lead delivery — sans config : Connect CRM ; avec config : host + Ready/Off, toggle enable/disable, Test, Delete (clic → wizard) ; wizard sur `/partner/settings/crm-outbound` (endpoint HTTPS, auth, mapping → JSON plat) — [PARTNER_CRM_OUTBOUND.md](PARTNER_CRM_OUTBOUND.md)
- **Modifier états ciblés** (sélection / désélection) — **validé cliente** ; minimum **15 états** pour rester éligible aux achats
- Modifier type lead (Traditional / High-Intent)
- Config récurrence wallet
- Message bloquant si < 15 états : « Veuillez sélectionner au moins 15 états »

#### Contact Us
- Page `/partner/contact` : sujet (liste fermée) + message
- Soumission `POST /api/partner/contact` (auth partner) → email admin via Resend (`reply-to` = email partner) puis confirmation partner
- Destinataire admin configurable (`contact_recipient_email`) ; échec envoi admin → erreur ; échec confirmation → succès avec avertissement
- Pas de `mailto:` côté client

### 5.4 Pipeline d’intake leads

**Endpoint :** `POST /api/leads/intake` (nom indicatif)

**Déclencheur :** LeadConduit envoie POST à chaque soumission Meta.

**Traitement :**
1. Valider payload (champs minimum : contact, state, trustedform_cert_url — `lead_type` n’est plus inféré à la normalisation)
2. **Évaluer les catégories lead** actives : critères AND sur clés top-level du payload (match exact, case-sensitive) ; 1 match → `leadType` ; 0 ou 2+ → `status=review`, `categoryResolution` `no_match` / `multiple_matches`, pas de matching ni Integrity
3. Créer lead : `received_at=now()`, `available` selon résolution catégorie, `refundable=true`, `status` unmatched ou review
4. Répondre `{ "outcome": "success" }` (format LeadConduit)
5. Déclencher matching engine (uniquement si catégorie résolue et TrustedForm OK)

**Source champs :** déduire depuis Boberdoo / LeadConduit — ne pas demander à la cliente.

### 5.5 Moteur de matching (temps réel)

**Déclenchement :** à chaque nouveau lead + job retraitement 24 h + retour file après remboursement **type A** (mauvais critère — voir §5.8).

**Critères temps réel V1 (tous requis) :**
1. État du lead ∈ `filter_states` du partner
2. `lead_type` partner = type du lead
3. Partner `status = active` (approuvé + non désactivé)
4. `length(filter_states) ≥ 15`
5. `wallet_balance ≥ prix_effectif` (prix global ou `price_override`)
6. Lead `available = true`

**Sélection gagnant :** priorité la plus haute (1–10). **Égalité de priorité → FIFO** (partner inscrit le plus tôt en premier — confirmé équipe).

**Actions post-match :**
1. Créer `lead_delivery` (channel=realtime, price, delivered_at)
2. Débiter wallet + transaction ledger
3. `lead.available = false`, `lead.status = delivered`
4. Email agent
5. Push CRM si configuré

**L’agent ne clique pas pour accepter** — distribution 100 % automatique.

### 5.6 File unmatched & retraitement

**Si aucun agent éligible :**
1. Lead reste `status=unmatched`, `available=true` ; inscrit dans la **work queue** (`nextRoutingAttemptAt`)
2. Job périodique (in-process ou cron HTTP) : claim + routage selon le **mode** (sauf leads `review` ou catégorie non résolue)
3. **Partner-only** (`lifecycle_routing_enabled` off, défaut) : matching partenaires uniquement — **aucune** revente Integrity à aucun âge
4. **Lifecycle client** (flag on — voir `docs/client_email_lead_routing_2026-08-03.txt`) :
   - **0–24 h** : Integrity Realtime (ILC) uniquement ; pas de match partner automatique
   - **24–48 h** : partner **ou** Storefront en premier (config admin `lifecycle_mid_window_primary`), puis l’autre si échec définitif ; un posting Integrity `pending` bloque le fallback
   - **48 h–30 j** : partners plateforme uniquement (cron auto contrôlé par `lifecycle_partner_auto_reprocess_enabled`, défaut on)
   - **30 j+** : éligibilité aged marketplace ; exclus de la file live auto
5. **Échecs Integrity** : seul « No Campaign Available » est retryable (15/30/60 min) ; les autres rejets métier bloquent les futurs essais automatiques du mode rejeté seulement. Un rejet Realtime laisse donc Storefront disponible à sa fenêtre ; Storefront est bloqué indépendamment après son propre rejet. Les champs lead `integrityBlockedAt` / raison restent legacy pour audit/affichage et ne pilotent plus globalement le routage ; 429/5xx/réseau = opérationnel (backoff technique)
6. **Une vente live** (partner, Realtime ou Storefront) pose `liveSoldAt` / `liveSaleChannel` et arrête tout routage live automatique
7. Lead reste en base pour aging J+30
8. **Reprocess manuel** : partenaires sélectionnés = allowlist stricte ; pas de fallback Storefront ; picker seulement si Partner est la route active

### 5.7 Marketplace aged leads

**Éligibilité listing (séparée de `available` et des filter sets temps réel) :**
- `now - received_at ≥` seuil marketplace (= `minDays` du premier `aged_price_tiers`, défaut 30 ; sync `aged_days_threshold`)
- `status != dead`
- **Pas de condition `available = true`** — un lead déjà vendu en temps réel (`available=false`) peut être listé
- **Pas d’application des `partner_filter_sets`** sur le browse : le partenaire voit l’inventaire aged global et filtre via l’UI multi-select (états, types, âges ; pas Have IUL)

**Achat partner :**
- Manuel (unitaire ou checkboxes) ; débit wallet au **prix du tier** d’âge (`aged_price_tiers` ; fallback `default_aged_price` si hors bande)
- Compte `active` + solde wallet suffisant
- Lead toujours éligible aged au moment de l’achat (même règles d’âge / hors `dead`)
- **Pas** de contrôle état ∈ filter set ni égalité `lead_type` compte (distinct du matching temps réel)
- Créer `lead_delivery` channel=`aged`
- 1ʳᵉ vente aged → cooldown jusqu’au début du tier suivant (`agedAvailableAfter`) **ou** retrait immédiat si le partenaire **mark as sold** dans les 7 jours (`partner_sold_at`) ; 2ᵉ vente (flux sans mark-as-sold) → retrait permanent
- `available` **reste `false`** (déjà vendu ou non — inchangé)
- Email + CRM

**Pas de plafond** de ventes aged par lead (décision équipe). Un lead = un acheteur aged à la fois (verrou via transaction ou flag dédié si besoin).

### 5.8 Remboursements

**Workflow in-app obligatoire** (confirmé call review #1). Deux **types** distincts :

#### Type A — Mauvais critère / mauvais état

Ex. : l’agent voulait le Texas, a reçu un lead Californie.

```
Agent → demande remboursement (raison : wrong_filter)
  → Admin approuve
       - delivery.refunded_at = now
       - Crédit wallet agent (montant delivery.price)
       - lead.available = true
       - Rematch immédiat vers le partner/agent suivant (même critères, priorité inférieure)
       - Prix de revente = prix d’origine (ex. 25 $)
```

#### Type B — Numéro invalide / hors service

Ex. : numéro Meta incorrect ; admin appelle et confirme.

```
Agent → demande remboursement (raison : invalid_phone)
  → Admin vérifie (appel) → approuve ou refuse
  → Si approuvé :
       - delivery.refunded_at = now
       - Crédit wallet agent (montant delivery.price)
       - lead.available = false, status = dead (ou équivalent)
       - Lead **non redistribué** — mort définitivement
```

**Buffer 15 % :** règle métier **verbale** de la cliente (leads Meta) — **non automatisée dans Boberdoo** (vérifié browser 29 juin). V1 : workflow manuel identique à Boberdoo ; pas de compteur ni blocage auto dans l’app.

**Cycle remboursement + revente (type A) :** après revente post-remboursement, `refundable = false` — plus de second remboursement sur ce lead.

**Note :** l’ancienne règle interne TECHMA « routage post-remboursement par âge (< 2 j / Integrity / aged) » est **remplacée** par ce modèle validé cliente (voir §7).

### 5.9 Wallet Stripe

**Modèle : wallet prépayé (stored value)**

```
Recharge Stripe → argent compte Stripe cliente → webhook → +wallet_balance BDD
Livraison lead → -wallet_balance BDD (pas de nouvelle charge Stripe)
```

**Modes recharge :** manuelle ponctuelle + récurrente hebdomadaire (les deux en V1).

**Statut actif :** `wallet_balance >= prix_effectif_agent`.

### 5.10 Notifications email

- Agent : email à chaque lead livré (temps réel ou aged)
- Admin : optionnel — spike unmatched, demandes remboursement
- Pas d’email mot de passe (Clerk)

### 5.11 CRM custom delivery

- Chaque agent configure **un profil POST** via `/partner/settings/crm-outbound` (accès depuis la carte Lead delivery) : URL, auth (`none` / bearer / header / basic / champs body), mapping source → clés JSON plat, règle de succès optionnelle
- Settings affiche email + CRM : **configuré** (URL sauvegardée) distinct de **activé** (`enabled`) — host + badge Ready/Off, toggle Power (GET puis PATCH), Test (modal, retourne aussi `requestPayload`), Delete ; sans config → Connect CRM seul
- À chaque livraison matchée : **email toujours** (Resend) ; si config **activée** (`enabled`), POST vers l’endpoint partner
- Échec POST : pas de retry ; email partner avec raison (**sans** payload lead)
- Spécification complète : [PARTNER_CRM_OUTBOUND.md](PARTNER_CRM_OUTBOUND.md) (SSRF, test fixture, admin lecture seule)
- Mode `integrations_mode=mock` (valeur `app_settings` prime sur env) : pas d’appels HTTP CRM réels ; événements lead tracés

### 5.12 Revente IntegrityCONNECT

**Modes :**
- **Real-time post** : vente immédiate par soumission directe LeadConduit, sans ping préalable ; `outcome: success` sur le submit → posting **sold** immédiatement + événement `integrity_posted` (Posted = accepté ; pas d’événement `integrity_accepted` séparé ; pas d’attente webhook)
- **Storefront post** : envoi direct LeadConduit (pas de ping gate LC) ; même sold immédiat + `integrity_posted` sur success sync ; webhook callback optionnel / idempotent (émet `integrity_posted` seulement si pas déjà sold)

**Mock :** les posts Integrity automatiques envoient toujours du HTTP vers LeadConduit avec `is_test=yes`. Les posts live auto ne forcent pas `is_test`. Les boutons admin test incluent toujours `is_test=yes` et envoient eux aussi du HTTP LeadConduit.

**Déclenchement :** selon fenêtre lifecycle (flag on) ou matching Partner-only (flag off — jamais Integrity auto).

**Admin :** liste postings (badge **Sold** / **No Campaign Available**) ; détail payloads + événements ; **Reprocess** immédiat `POST /api/admin/integrity/postings/[id]/reprocess` (bloqué si sold / vente live, mais contourne le bloc automatique du mode) ; Connection test via modal Review payload ; preview routage (`POST /api/admin/lead-routing/preview`).

**Routing mode :** `lifecycle_routing_enabled` (**off** par défaut = Partner-only) ; cutoffs 24 h / 48 h ; mid-window primary `partner` ou `storefront` ; `lifecycle_partner_auto_reprocess_enabled` pour le cron partners 48 h–30 j.

**Échecs Integrity :** NCA → `retryable_no_campaign` (backoff cron 15/30/60 min) ; autres rejets métier → `terminal_business_rejection`, dérivé séparément pour Realtime et Storefront depuis le mode des postings + événements `integrity_rejected` (pas de retry automatique du mode rejeté ; autre mode encore disponible ; Reprocess manuel disponible) ; 429/5xx/réseau = opérationnel. Aucune migration de schéma requise.

**Implémentation :** `src/lib/lead-routing/` (policy, work-queue, coordinator) + `src/lib/integrity/` (dont `classify.ts`) ; specs Boberdoo : [BOBERDOO_INTEGRITY_DELIVERY_CAPTURE.md](BOBERDOO_INTEGRITY_DELIVERY_CAPTURE.md).

### 5.13 Migration historique Boberdoo

**Décision :** fonctionnalité **prévue et livrée** en V1, exécution quand export disponible.

**Scope import :**
- Leads historiques (contact, état, dates, TrustedForm si présent, champs source métier)
- Export/import CSV round-trip : l’export admin reprend tous les résultats de la vue sélectionnée, indépendamment de la pagination, avec tous les scalaires `Lead` — identité/contact (`id`, `external_id`, noms, coordonnées, état, ZIP, DOB, âge), classification/métier (`lead_type`, `category_resolution`, `category_candidate_types`, intent/IUL, champs produit), conformité/source (TrustedForm, TCPA, tracking, `received_at`) et état interne/audit (disponibilité, statut, aging, vente live, routage, bloc Integrity, timestamps) — plus `raw_payload`
- Chaque valeur non scalaire du format full-fidelity est encodée en texte CSV : `raw_payload` est une chaîne JSON, `category_candidate_types` est un tableau JSON, les booléens utilisent `true`/`false` et les dates sont ISO. Les virgules, guillemets et retours à la ligne sont échappés par le format CSV.
- L’import détecte automatiquement ce format grâce à `id` + `raw_payload`, accepte les champs système protégés et restaure les valeurs fournies. `id`, `status`, `received_at`, `created_at`, `updated_at` et `category_resolution` sont optionnels (dérivés / classification active / maintenant si absents). Minimum par ligne : `firstName`, `email`, `state`, plus `raw_payload` **ou** `lead_type`. Les doublons/conflits d’ID ou d’`external_id` sont des erreurs de ligne seulement lorsque ces identifiants sont présents, sans écrasement/upsert ; les autres lignes sont traitées et le rapport indique les erreurs.
- Les imports manuels restent rétrocompatibles : mapping de colonnes et alias reconnus, template minimal inchangé, minimum requis `firstName`, `email`, `state`, champs protégés ignorés/recalculés, champs inconnus conservés dans `rawPayload` et classification identique à l’intake
- Le CSV prend en charge les valeurs avec commas, guillemets échappés et retours à la ligne
- **Classification catégorie** via la table `lead_categories` (même logique qu’intake) — plus de fallback implicite Traditional/High Intent depuis `SRC`
- Optionnel : agents existants (mapping vers Clerk manuel ou invite)

**Écran admin :**
- Upload fichier
- Le template téléchargeable reste un exemple minimal ; il ne représente pas le schéma complet d’export
- Preview & validation
- Import batch avec rapport erreurs
- Ne pas bloquer le reste du build si import non exécuté jour 1

---

## 6. User flows

### 6.1 Flux système — lead entrant

```
LeadConduit POST webhook
  → Créer lead (available selon catégorie)
  → Évaluer catégories lead (critères admin)
       ├─ 0 ou 2+ matchs → review (pas de matching)
       └─ 1 match → leadType défini
            → Matching engine
                 ├─ Agent éligible trouvé (priorité max)
                 │    → Débit wallet, delivery, email, CRM, available=false
                 └─ Aucun agent
                      → unmatched ; routing coordinator (Partner-only ou lifecycle)
                           ├─ Match / Integrity selon mode + phase
                           └─ liveSoldAt posé → plus de routage live auto
  → [Parallèle temps] J+30 → éligible marketplace aged si available
```

### 6.2 Flux agent — inscription à première lead

```
Signup Clerk → accès portail (non actif)
  → Onboarding (états, type, affiliation) — peut ajouter carte, pas de débit
  → Admin approuve → status active
  → Agent ajuste états si besoin (≥ 15 requis)
  → Stripe : recharge wallet
  → wallet OK + ≥ 15 états
  → [Automatique] prochain lead matching → email + portail "Mes leads"
```

### 6.3 Flux agent — achat aged

```
Portail → Marketplace aged
  → Filtres (état, type, budget)
  → Liste leads disponibles
  → Sélection (unitaire ou checkboxes)
  → Confirmer achat
  → Débit wallet, delivery, email, CRM
```

### 6.4 Flux remboursement

```
Agent : demande remboursement sur delivery (+ type / raison)
  → Admin : file pending → vérifie (appel si numéro invalide)
  → Approuve
       ├─ Type A (mauvais critère)
       │    ├─ Crédit wallet
       │    ├─ available=true
       │    └─ Rematch temps réel (priorité suivante, prix d’origine)
       └─ Type B (numéro invalide)
            ├─ Crédit wallet
            └─ Lead mort (available=false, pas de redistribution)
  → Si lead revendu après type A → refundable=false
```

### 6.5 Flux admin — journée type

```
Connexion → Dashboard (lecture seule si tout va bien)
  → Éventuellement : approuver nouvel agent, traiter remboursement
  → Pas d'export manuel, pas de construction commande aged
```

---

## 7. Règles métier

### Prix

| Type | Défaut | Override |
|------|--------|----------|
| IUL temps réel | 25 $ | Par agent (ex. Dominic 20 $) |
| Aged lead | 5 $ | Global admin |

### Priorité

- Défaut nouvel agent : **5**
- Admin règle 1–10 selon interne/externe
- Plus haut gagne à état égal

### Disponibilité lead (`available`)

> **`available` pilote uniquement le matching temps réel** — pas la marketplace aged (décision équipe).

| Événement | `available` (temps réel) | Aged marketplace |
|-----------|--------------------------|------------------|
| Création | `true` | non éligible (< 30 j) |
| Vente temps réel ou aged | `false` | — |
| Remboursement type A approuvé | `true` (rematch, même si > 30 j) | inchangé |
| Remboursement type B approuvé | `false` (lead mort) | exclu |
| J+30, lead vendu (cycle normal) | **`false`** (reste vendu) | **éligible** via critère âge, pas via `available` |
| Revente après remboursement type A | `false` après vente | selon âge / statut |

### Aged leads — critères (séparés de `available`)

Un lead peut apparaître en marketplace aged quand :
- `now - received_at ≥` seuil (= premier `aged_price_tiers.minDays`, défaut 30)
- `status != dead`
- **sans** exiger `available = true` (un lead déjà vendu en temps réel reste `available=false` mais peut être proposé en aged au prix de sa tranche)

Requête indicative : âge + état + type IUL + filtres partner — **pas** le booléen `available`.

Après achat aged : nouvelle `lead_delivery` channel=`aged` ; `available` reste `false` ; cooldown revente = début du tier suivant (sauf mark-as-sold ≤ 7 j sur 1ʳᵉ vente → retrait permanent).

### Filtres agent

- **Seul filtre V1 :** sélection d’états US (`filter_states`)
- **Minimum 15 états** pour être éligible aux achats / matching
- Pas de filtre « heure de réception » (abandonné côté cliente)
- Agent actif peut **modifier** ses états en self-service (paramètres portail)

### Aging (lead vendu — cycle normal, hors remboursement)

- Âge = `now - received_at`
- Lead **vendu** en temps réel : `available` reste **`false`**
- Au seuil marketplace (défaut **J+30**, dérivé du 1ᵉʳ tier) : listable en **marketplace aged** au **prix de la tranche** — **sans** repasser `available` à `true`
- Tranches / prix (éditables admin) : défauts 30–60@$5, 61–90@$4, 91–180@$3, 181–365@$2, 366+@$1 ; filtres âge = `String(minDays)`

### Remboursement type A et âge du lead

- Remboursement **type A** (mauvais critère) : `available=true` **immédiatement**, rematch temps réel — **même si le lead a plus de 30 jours** (confirmé équipe)
- Remboursement **type B** (numéro invalide) : lead mort, `available=false` — pas de redistribution, quel que soit l’âge

### Post-remboursement — routage (validé cliente, review #1)

| Type | Après approbation admin |
|------|-------------------------|
| **A — Mauvais critère** | Rematch temps réel, partner priorité suivante, **prix d’origine** |
| **B — Numéro invalide** | Crédit wallet ; lead **mort**, aucune redistribution |

*Ancienne hypothèse équipe (âge < 2 j → temps réel ; ≥ 2 j → Integrity ; ≥ 30 j → aged) : **non validée** par la cliente — retirée des décisions figées.*

### Retraitement unmatched

- **Partner-only** (lifecycle off, défaut) : matching partenaires uniquement — pas d’Integrity automatique
- **Lifecycle** (flag on) : fenêtres 0–24 h / 24–48 h / 48 h–30 j — voir `docs/client_email_lead_routing_2026-08-03.txt` ; file due + backoff ; NCA et échecs opérationnels retryables ; rejet métier terminal → bloc automatique du mode rejeté uniquement
- Preview admin sans effet : `POST /api/admin/lead-routing/preview`

### Changement des règles de catégorie

- Réévaluer par lots les leads non finalisés à partir du payload brut avec le même évaluateur exact que l’intake
- Exclure les statuts `delivered`, `integrity_posted` et `dead`
- Si une seule catégorie matche, synchroniser la classification et remettre le lead `unmatched` / disponible, sans matching ni livraison immédiate
- Si zéro ou plusieurs catégories matchent, synchroniser la classification et placer le lead en `review` / indisponible
- Ne jamais écraser un lead devenu final pendant la réévaluation

### Volume

- ~500 leads/jour — concevoir intake et matching pour ce débit

---

## 8. Schéma de base de données

### Diagramme relationnel (conceptuel)

```
agents ──────────────┬──── lead_deliveries ──── leads
  │                  │            │
  │                  │            ├── resale_postings
  │                  │            │
  ├── transactions   │            │
  ├── refund_requests┘            │
  │                               │
  └── billing_recurrence          │
                                  │
app_settings (singleton)          │
migration_jobs                    │
```

### Table `agents`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| clerk_user_id | string unique | Lien Clerk |
| email | string | |
| first_name, last_name | string | |
| affiliation | string nullable | Nom agence partenaire |
| residence_state | string | État US résidence |
| lead_type | enum | traditional_iul \| high_intent_iul |
| filter_states | string[] | Codes état US ; **minimum 15** pour éligibilité achat |
| priority | int | 1–10, défaut 5 |
| price_override | decimal nullable | Prix custom (ex. 20.00) |
| wallet_balance | decimal | Solde courant, défaut 0 |
| status | enum | pending_approval \| active \| rejected \| disabled |
| stripe_customer_id | string nullable | |
| created_at, updated_at | timestamp | |

**Index :** status, priority, filter_states (GIN)

**CRM outbound (optionnel)** — table `partner_crm_outbound_configs` (1:1 avec agent/partner) : endpoint, auth, `field_mappings`, `success_rule`, `enabled`. Détail : [PARTNER_CRM_OUTBOUND.md](PARTNER_CRM_OUTBOUND.md).

### Table `lead_categories`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| type | string unique | Clé interne immuable (snake_case, générée à la création) |
| label | string | Libellé admin |
| default_price | decimal nullable | Prix temps réel suggéré |
| enabled | boolean | Exclue de l’évaluation si false |
| integrity_label | string nullable | Chaîne exacte `lead_type_thom` pour Integrity **Realtime** |
| integrity_label_storefront | string nullable | Chaîne `lead_type_thom` pour Integrity **Storefront** ; blank → fallback Realtime puis défaut IUL |
| created_at, updated_at | timestamp | |

### Table `lead_category_criteria`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| category_id | FK lead_categories | |
| field | string | Nom de clé top-level du payload webhook |
| value | string | Valeur exacte attendue (case-sensitive) |

Contrainte : un seul critère par `field` par catégorie ; tous les critères d’une catégorie doivent matcher (AND).

### Table `leads`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| first_name, last_name | string | |
| email, phone | string | |
| state | string | Code état US |
| lead_type | string nullable | Type interne (`lead_categories.type`) après résolution intake |
| category_resolution | enum | matched \| no_match \| multiple_matches |
| category_candidate_types | string[] | Types des catégories ayant matché (vide ou plusieurs en anomalie) |
| trustedform_cert_url | string nullable | |
| source | string | ex. meta_leadconduit |
| received_at | timestamp | **Référence aging** |
| live_sold_at | timestamp nullable | Première vente live (partner / Realtime / Storefront) |
| live_sale_channel | string nullable | `partner` \| `integrity_realtime` \| `integrity_storefront` |
| last_routing_attempt_at | timestamp nullable | Dernière tentative de routage auto |
| next_routing_attempt_at | timestamp nullable | Prochaine échéance due (work queue) |
| routing_attempt_count | int | Compteur tentatives (backoff) |
| integrity_blocked_at | timestamp nullable | Champ legacy d’audit/affichage ; le bloc effectif est dérivé par mode |
| integrity_blocked_reason | string nullable | Raison legacy normalisée ; ne bloque pas globalement le routage |
| routing_claimed_at / by / expires_at | timestamp / string nullable | Lease cron ou hold reprocess manuel |
| available | boolean | Défaut true |
| refundable | boolean | Défaut true |
| status | enum | unmatched \| delivered \| integrity_posted \| review \| dead |
| external_id | string nullable | ID LeadConduit / Boberdoo migration |
| raw_payload | jsonb nullable | Payload webhook brut (debug) |
| created_at, updated_at | timestamp | |

**Index :** state, status, available, received_at, (available, received_at) pour aged query

### Table `lead_deliveries`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| lead_id | FK leads | |
| agent_id | FK agents | |
| channel | enum | realtime \| aged |
| price | decimal | Prix facturé |
| delivered_at | timestamp | |
| refunded_at | timestamp nullable | |
| partner_sold_at | timestamp nullable | 1ʳᵉ vente aged : partenaire confirme la vente (≤ 7 j) → retrait marketplace |
| created_at | timestamp | |

**Index :** agent_id, lead_id, refunded_at

### Table `refund_requests`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| lead_delivery_id | FK | |
| agent_id | FK | |
| reason | text nullable | Détail libre |
| refund_type | enum | wrong_filter \| invalid_phone |
| status | enum | pending \| approved \| rejected |
| reviewed_by | FK agents nullable | Admin |
| reviewed_at | timestamp nullable | |
| created_at | timestamp | |

### Table `transactions`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| agent_id | FK | |
| type | enum | top_up \| admin_grant \| lead_purchase \| aged_purchase \| refund \| reprocessing_fee |
| amount | decimal | Positif = crédit, négatif = débit |
| balance_after | decimal | Snapshot solde |
| stripe_payment_intent_id | string nullable | |
| lead_delivery_id | FK nullable | |
| description | string nullable | |
| created_at | timestamp | |

**Règle :** ledger append-only — jamais modifier une transaction passée.

### Table `billing_recurrence`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| agent_id | FK | |
| amount | decimal | ex. 500.00 |
| interval | enum | weekly |
| stripe_subscription_id | string nullable | Si via Subscription |
| active | boolean | |
| next_charge_at | timestamp nullable | |

### Table `resale_postings`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| lead_id | FK | |
| mode | enum | realtime \| storefront |
| status | enum | pending \| sold \| rejected \| reconciled |
| external_ref | string nullable | |
| posted_at, sold_at | timestamp nullable | |
| revenue_share | decimal nullable | |

### Table `app_settings`

| Colonne | Type | Description |
|---------|------|-------------|
| key | string PK | |
| value | jsonb | |

**Clés initiales :** `default_realtime_price`, `default_aged_price` (fallback hors bande seulement), `aged_price_tiers` (JSON bandes `{ minDays, maxDays|null, price }` — pricing marketplace + cooldown revente ; défauts 30–60@$5 … 366+@$1 ; seuil marketplace = `minDays` du 1ᵉʳ tier, sync `aged_days_threshold`), `admin_approval_required`, `integrations_mode`, `lifecycle_routing_enabled` (défaut false = Partner-only), `lifecycle_realtime_cutoff_hours` (24), `lifecycle_storefront_cutoff_hours` (48), `lifecycle_mid_window_primary` (`partner` \| `storefront`), `lifecycle_partner_auto_reprocess_enabled` (défaut true), `reprocess_partner_picker_enabled`, `contact_recipient_email` (destinataire Partner Contact Us ; défaut `sami@ffl-capital.com`) ; `integrity_post_delay_hours` conservée pour rollback uniquement (plus active)

### Table `migration_jobs`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| status | enum | pending \| running \| completed \| failed |
| file_name | string | |
| total_rows, success_rows, error_rows | int | |
| error_log | jsonb nullable | |
| created_by | FK admin | |
| created_at, completed_at | timestamp | |

---

## 9. Intégrations externes

| Service | Direction | Rôle | Dev sans client |
|---------|-----------|------|-----------------|
| LeadConduit | Entrée | Webhook leads | Simulateur + fixtures |
| TrustedForm | Entrée (via LC) | Certificat dans payload | URL factice |
| Clerk | Auth | Login, rôles | Instance dev |
| Stripe | Entrée | Top-up wallet | sk_test TECHMA |
| Resend | Sortie | Emails (livraison lead + Contact Us partner) | Mailtrap / log |
| IntegrityCONNECT | Sortie | Revente leads | Auto post LC + `is_test=yes` (mock) |
| CRM agent | Sortie | POST JSON (config partner) | wizard Test + `pnpm run test:outbound` |

**Contrat réponse LeadConduit :** `{ "outcome": "success", "reason": "" }`

---

## 10. Stratégie de tests & mocks

### Simulateur lead (dev)

Page interne `/dev/lead-simulator` (masquée en prod) :
- Formulaire : nom, email, phone, state, lead_type
- Génère trustedform_cert_url factice
- POST vers `/api/leads/intake`

### Fixtures

Fichiers JSON représentatifs dans `fixtures/` — format aligné sur Boberdoo une fois exploré.

### `INTEGRATIONS_MODE=mock` / `app_settings.integrations_mode`

Le mode effectif vient de `app_settings.integrations_mode` (dropdown admin Mode, sauvegarde immédiate, prod inclus). Env `INTEGRATIONS_MODE` ne s’applique que si la clé DB est absente. Défaut : `mock` en dev, `live` en prod.

| Service | Comportement mock |
|---------|-------------------|
| Integrity | Auto posts et admin test : HTTP LeadConduit réel avec `is_test=yes` |
| CRM outbound | Pas d’HTTP réel ; événements `crm_outbound` / échecs tracés |
| Email | Console / Mailtrap |
| Stripe | Vraies clés test (pas mock) |

### Tests manuels checklist

- [ ] Lead entre → match agent CA priorité 10
- [ ] Wallet insuffisant → pas de livraison
- [ ] Unmatched — Partner-only (flag off) : match partners, pas d’Integrity auto
- [ ] Lifecycle on — fenêtres 0–24 / 24–48 / 48–30j ; NCA → retry ; rejet métier → bloc automatique du mode concerné uniquement
- [ ] Seuil aged (1ᵉʳ tier) → aged listing **sans** `available=true` ; prix = tier
- [ ] Achat aged checkboxes → débit wallet (prix par lead selon tier)
- [ ] Remboursement type A → rematch priorité suivante, prix d’origine
- [ ] Remboursement type B → crédit wallet, lead mort (pas de redistribution)
- [ ] Admin grant credits → partenaire `active`, ledger `admin_grant`, email partner, Total Funded inclut le grant
- [ ] Signup → portail non actif → onboarding → admin approve → ≥ 15 états → active
- [ ] Migration import dry-run

---

## 11. Design & UX

### Références

- Site **Integrity Marketing** (bleu, typo) — pas document formel
- Instance **Boberdoo** client — parité fonctionnelle écrans
- Ambition : **moderne**, nettement au-dessus de Boberdoo actuel

### Principes

- Admin dense mais lisible (tables, filtres, statuts colorés)
- Agent simple : wallet visible, leads clairs, aged marketplace intuitive
- Mobile-responsive souhaitable (agents consultent leads sur téléphone)

### Composants clés agent

- Badge **Actif** / **Inactif** (wallet)
- Liste leads avec état US en évidence
- Marketplace aged : filtres en haut, checkboxes, CTA achat

---

## 12. Phases de livraison

> **Statut juillet 2026 :** phases 1–4 et core backend **implémentées** en mode test. Voir [PROJECT.md §18](PROJECT.md#18-état-implémentation-backend--ui).

### Phase 1 — Fondations (semaine 1) ✅

- Repo GitHub, **Next.js + Prisma** + Supabase dev
- Clerk auth, rôles admin/partner
- Schéma BDD migrations
- Shells UI Admin + Partner
- Onboarding partner + **approbation admin**
- Feature flag `ADMIN_APPROVAL_REQUIRED`

### Phase 2 — Intake & matching (semaine 2) ✅

- Webhook intake + simulateur + feeding-platform
- Moteur matching (filter sets v2)
- File unmatched + job retraitement 24 h
- Admin : liste leads, filtres, détail, event log

### Phase 3 — Wallet & notifications (semaine 3) ✅

- Stripe test top-up manuel + récurrent
- Ledger transactions, statut actif
- Emails lead livré (Resend)
- Contact Us partner (Resend, destinataire admin configurable)
- Portail partner : mes leads, wallet

### Phase 4 — Aged & remboursements (semaine 4) ✅

- Seuil aged dérivé du 1ᵉʳ `aged_price_tiers` (défaut J+30 ; sync `aged_days_threshold`)
- Marketplace aged (unitaire + checkboxes ; prix par tier ; filtres âge = `String(minDays)`)
- Workflow remboursement in-app (Type A/B)
- Routage post-remboursement

### Phase 5 — Intégrations & migration (semaines 5–6) ⏳ partiel

- IntegrityCONNECT live (posts LeadConduit directs + flag lifecycle) — **code prêt, activation contrôlée**
- CRM outbound POST self-service (wizard partner) — ✅ — [PARTNER_CRM_OUTBOUND.md](PARTNER_CRM_OUTBOUND.md)
- **Migration Boberdoo** (écran import CSV) — ✅
- Deploy Netlify + Supabase staging — ⏳
- Cutover LeadConduit prod — ⏳ voir [LEADCONDUIT_SETUP.md](LEADCONDUIT_SETUP.md)

### Phase 6 — Livraison Replit ⏳

- Export Supabase → Replit Postgres
- Deploy Replit, reconfig webhooks
- Stripe prod client
- Formation admin cliente

---

## 13. Hors scope V1

- Frais de retraitement (montant à définir plus tard)
- Factures PDF
- Panier aged leads persistant
- Filtres matching au-delà état + type IUL
- Plafond ventes aged
- Accès Meta Ads Manager
- App mobile native
- Multi-langue

---

## 14. Décisions figées

| # | Décision |
|---|----------|
| D1 | Mono-domaine pour tous les agents |
| D2 | Clerk pour auth — pas d'email identifiants maison |
| D3 | **Approbation admin après signup** — défaut oui, désactivable |
| D4 | **Migration historique** — feature livrée V1 |
| D5 | Matching V1 : état + type IUL + wallet + **≥ 15 états** + priorité |
| D6 | `available` booléen pilote le matching **temps réel** ; aged utilise critère **âge** séparé (seuil = 1ᵉʳ `aged_price_tiers.minDays`, défaut J+30) |
| D7 | Un remboursement max par cycle ; `refundable=false` après revente (type A) |
| D8 | Remboursement in-app obligatoire ; admin vérifie (appel si numéro invalide) |
| D9 | **Deux types remboursement** : A = rematch prix origine ; B = lead mort, pas redistribution |
| D10 | Aged : achat unitaire + checkboxes V1 ; prix / filtres via `aged_price_tiers` |
| D11 | Pas de plafond ventes aged |
| D12 | Recharge wallet manuelle + récurrente |
| D13 | Payload/champs/API : sourcer via Boberdoo — pas demander à cliente |
| D14 | Dev Cursor → deploy Netlify+Supabase → migration Replit |
| D15 | PostgreSQL portable — pas Supabase Auth |
| D16 | **Minimum 15 états** pour éligibilité agent ; agent peut modifier ses états après activation |
| D17 | **Filtre unique V1** : états US — pas de filtre horaire |
| D18 | **Pas de sous-domaines** par agence — mono-domaine validé (review #1) |
| D19 | **Égalité de priorité → FIFO** (partner le plus ancien en premier) |
| D20 | Stack : **Next.js + Prisma + Supabase + shadcn/ui** ; pas Docker |
| D21 | **Vocabulaire UI = Boberdoo** : « Partner » (pas « Agent » en interface) |

---

## 15. Questions ouvertes

### Cliente (simple)

| # | Question | Statut |
|---|----------|--------|
| Q1 | Frais de retraitement — montant ? | **Reporté** — hors V1 |
| Q2 | Clés Stripe production — quand ? | **Reporté** — mode test TECHMA d’abord |
| Q3 | Désactiver approbation admin si souhait ? | Feature flag prêt — **confirmé : approbation requise** (review #1) |

### Interne TECHMA

| # | Question | Statut |
|---|----------|--------|
| Q4 | ~~Seuil 2 jours post-remboursement~~ | **Retiré** — modèle deux types (review #1) |
| Q5 | Next.js vs Vite+Hono | **Résolu : Next.js** |
| Q6 | Partner modifie ses `filter_states` après onboarding ? | **Résolu : oui** (review #1) |
| Q7 | Format exact export migration Boberdoo | **Résolu** — `BOBERDOO_EXPLORATION.md` §35 |
| Q8 | Égalité de priorité — tie-breaker ? | **Résolu : FIFO** |
| Q9 | Buffer 15 % — implémentation ? | **Résolu** : règle métier manuelle uniquement — pas d’automatisation V1 (parité Boberdoo) |
| Q10 | `available` pour aged leads ? | **Résolu** : `available` = temps réel seulement ; aged = critère âge (seuil 1ᵉʳ tier, défaut J+30) |
| Q11 | Vocabulaire UI Partner vs Agent ? | **Résolu : Partner** (vocabulaire Boberdoo) |
| Q12 | Prisma vs Drizzle ? | **Résolu : Prisma** |
| Q13 | Supabase vs Docker local ? | **Résolu : Supabase** |

---

## Annexe — Lecture pour agents IA

**Ordre de lecture :**
1. Ce fichier (`PRD.md`) — spec implémentation
2. `PROJECT.md` — contexte, décisions, FAQ
3. `capital_solu_initial_call_transcript.txt` — call découverte
4. `first review with client` — review #1 (29 juin 2026)
5. Proposition TECHMA — scope contractuel

**Ne pas faire :**
- Demander JSON/payload à la cliente
- Utiliser Supabase Auth
- Implémenter Stripe Connect
- Bloquer le dev en attendant Meta ou Integrity

**Commencer par :**
- Schéma BDD + Clerk + shells UI + simulateur webhook + matching mock
