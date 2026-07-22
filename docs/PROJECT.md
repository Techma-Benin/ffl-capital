# FFL Capital — Plateforme de distribution de leads

> Mémoire projet pour l'équipe TECHMA et agents IA.  
> Dernière mise à jour : 21 juillet 2026 (v7 — implémentation V1 largement complète)

---

## 1. Résumé exécutif

**Client** : entreprise de génération de leads **IUL** (assurance vie indexée universelle), partenaire d’**Integrity Marketing**.

**Problème** : ils utilisent **Boberdoo** pour capturer, matcher et facturer des leads (~500/jour via Meta). Boberdoo ne permet pas de gérer correctement les **aged leads** (leads de plus de 30 jours) ni l’achat en self-service par les agents.

**Solution** : plateforme web **propriétaire** (usage interne, pas un SaaS) avec :
- Portail **Admin** (le client)
- Portail **Agent/Partenaire** (acheteurs de leads)
- Moteur de **matching** (état + priorité + wallet)
- **Marketplace aged leads** (innovation principale)
- Intégrations Stripe, IntegrityCONNECT, CRM partenaires

**Budget client** : 5 000 USD | **Délai** : 4–6 semaines | **Hébergement cible** : Replit

---

## 2. Glossaire métier

| Terme | Définition |
|-------|------------|
| **Lead** | Prospect ayant rempli un formulaire (nom, contact, état, etc.) |
| **IUL** | Indexed Universal Life — type d’assurance vie ciblé par les campagnes |
| **Partner** | Acheteur de leads — **terme UI et métier** (parité Boberdoo). Une personne = un compte. |
| **Company** | Nom d’agence / affiliation (champ texte sur le profil partner) |
| **Lead temps réel** | Lead frais (~25 $) distribué automatiquement à un agent actif |
| **Aged lead** | Lead présent dans le système depuis **30+ jours**, revendu à **5 $** |
| **Actif** | Agent dont le wallet couvre au moins le prix d’un lead |
| **Priorité (1–10)** | Poids de routage ; priorité 10 bat priorité 8 pour le même état |
| **TrustedForm** | Certificat de consentement légal généré lors du remplissage du formulaire |
| **Ping/Post** | Protocole API pour vendre un lead à un acheteur tiers (IntegrityCONNECT) |
| **Storefront** | Mode revente différé avec réconciliation journalière |
| **Wallet** | Solde prépayé Stripe débité à chaque livraison/achat de lead |
| **Filter set** | Profil de **matching** partner : états, type IUL, priorité, limites H/J, prix — plusieurs par partner ; pilote la distribution temps réel, pas l’affichage de la liste leads |
| **Vue leads (lead list view)** | Configuration **persistée** de liste : filtres d’affichage, tri, colonnes visibles ; scope **admin** (global) ou **partner** (par compte). URL portail : `?view=<uuid>`. Distinct d’un filter set |

---

## 3. Comment les leads arrivent sur la plateforme

### Flux actuel (documenté)

```
Meta Lead Ads
    → LeadConduit (agrégation / routage)
        → TrustedForm (certificat de consentement injecté dans le payload)
            → Champ personnalisé / webhook
                → Boberdoo (aujourd’hui) → Notre plateforme (cible)
```

### Détail par étape

1. **Meta** : une pub génère ~500 leads/jour, tous états US, type IUL (Traditional ou High-Intent).
2. **LeadConduit** : middleware qui reçoit les soumissions Meta et les enrichit/redirige.
3. **TrustedForm** : script sur le formulaire ; à chaque soumission, génère une **URL de certificat** (preuve que la personne a bien rempli le formulaire). Ce certificat est **transmis avec le lead**, pas créé par notre plateforme.
4. **Notre plateforme** : reçoit le lead via **webhook/API** (payload JSON incluant le certificat TrustedForm, état, type, coordonnées, timestamp).

### Ce que notre app doit faire à la réception

- Persister le lead avec `received_at` (base du calcul des 30 jours)
- Stocker l’URL/certificat TrustedForm
- Lancer le moteur de matching automatiquement
- Si non matché : file d’attente + retraitement 24 h → puis revente IntegrityCONNECT

### Référence Loom / call client

| Sujet | Timestamp transcript (`capital_solu_initial_call_transcript.txt`) |
|-------|-------------------------------------------------------------------|
| Flux Meta → LeadConduit → TrustedForm → Boberdoo | **04:41 – 05:14** |
| TrustedForm = preuve légale du remplissage | **05:06 – 05:14** |
| Volume ~500 leads/jour, tous états | **10:21 – 10:46** |
| Leads non matchés + retraitement 24 h | **10:46 – 11:09** |

---

## 4. Cycle de vie d’un lead

### Lead « non vendu » (unmatched)

Un lead est **non vendu** quand aucun agent actif ne correspond aux critères (surtout **l’état US** + **priorité** + **solde wallet**).

**Ce qui se passe :**
1. Entrée en base avec statut `unmatched`
2. **Retraitement pendant 24 h** : le système réessaie périodiquement de le matcher (ex. un agent recharge son wallet ou change ses filtres)
3. Si toujours non vendu après 24 h → envoi vers **IntegrityCONNECT** (ping/post temps réel ou storefront 48 h)
4. Après **30 jours** dans le système → devient **aged lead** (5 $), visible dans la marketplace

Exemple client : lead Wisconsin, personne ne veut cet état → rejeté temps réel, reste unmatched (**17:08 – 17:32** dans le transcript).

### Lead « vendu » (matched / delivered)

Un lead est **vendu** quand il est assigné à un agent :

1. Matching automatique (état + priorité)
2. **Débit du wallet** de l’agent (25 $ par défaut, remise possible)
3. Statut → `delivered` / `owned`
4. **Email** envoyé à l’agent
5. Optionnel : push vers CRM (Ringy, HubSpot, etc.)

**Après la vente :**
- Le lead **ne réapparaît pas** dans la file temps réel
- Il **reste en base** (important pour aged leads)
- Après **30 jours** : peut être proposé comme **aged lead** à 5 $ (même s’il avait déjà été vendu une fois — le client le confirme explicitement)
- Possibilité de **rembourser** + **revendre** avec frais de retraitement
- En temps normal : **1 seul propriétaire** par livraison (règle fixe, pas une config admin globale)
- Exception : l’admin peut augmenter le plafond de ventes **sur un lead précis** lors d’un remboursement/revente (voir §4.1 et §7)

Références Loom :
- Matching automatique : **16:43 – 17:08**
- Aged leads même si déjà matchés : **13:11 – 13:57**
- Remboursement / retraitement / multi-vente : **14:34 – 15:30**

### 4.1 Disponibilité et vente d’un lead — modèle validé (équipe)

**Règle métier retenue :**

> **`available` = matching temps réel uniquement.** La marketplace aged utilise l’**âge du lead (J+30)**, pas `available`.

| Événement | `available` (temps réel) | Marketplace aged |
|-----------|--------------------------|------------------|
| Lead entre dans le système | `true` | non (< 30 j) |
| Vendu temps réel ou aged | `false` | aged : éligible à J+30 si pas `dead` |
| Remboursement type A | `true` (rematch) | selon âge |
| Remboursement type B | `false` (lead mort) | exclu |
| J+30, lead déjà vendu | **`false`** (inchangé) | **listable** (critère âge) |
| Achat aged | `false` (inchangé) | delivery channel=`aged` |

**Pas de plafond** sur le nombre de ventes aged (décision équipe v3).

**Pas de compteur** `sales_count` sur la table `leads` — le booléen `available` pilote l’achat.

**Historique obligatoire** (table `lead_deliveries` ou `purchases`) : pas pour compter sur le lead, mais pour savoir **à qui** le lead a été vendu, tracer wallet/transactions, et lier les remboursements. L’agent voit « ses » lignes ; l’admin voit tout.

```
leads
  ├── available: boolean      -- peut-on encore vendre ce lead ?
  ├── refundable: boolean     -- false après 1er remboursement+revente
  ├── received_at
  └── ...

lead_deliveries               -- audit / portail agent / remboursements
  ├── lead_id, agent_id, channel (realtime|aged)
  ├── price, delivered_at, refunded_at
```

**Remboursements — deux types** (validé call review #1, 29 juin — voir `first review with client`) :

| Type | Cas | Après approbation admin |
|------|-----|-------------------------|
| **A — Mauvais critère** | Ex. agent voulait TX, a reçu CA | Crédit wallet ; lead remis en file ; **rematch** vers partner priorité suivante au **prix d’origine** (ex. 25 $) |
| **B — Numéro invalide** | Numéro Meta hors service ; admin appelle pour confirmer | Crédit wallet ; lead **mort** (`available=false`) — **aucune redistribution** |

**Buffer 15 %** : règle métier cliente (verbale) — **non automatisée dans Boberdoo** (browser 29 juin). Workflow manuel : partner demande → admin approuve/refuse. Pas de compteur ni blocage auto V1.

**Workflow in-app obligatoire** — l’agent signale dans le portail → l’admin approuve ou refuse (écran « Approve Refunds », parité Boberdoo) → crédit wallet si approuvé.

*Note : l’ancienne règle équipe « < 2 j → temps réel ; ≥ 2 j → Integrity ; ≥ 30 j → aged » n’a pas été validée par la cliente et est **retirée**.*

**Frais de retraitement :** hors scope V1 ; question cliente plus tard (non urgent).

---

## 5. TrustedForm — d’où vient le certificat ?

**TrustedForm n’est pas généré par notre plateforme.**

C’est un service tiers (ActiveProspect) dont le script JavaScript est embarqué sur le **formulaire de capture** (landing page / LeadConduit). Au moment où l’utilisateur soumet le formulaire :

1. TrustedForm enregistre la session et produit un **certificat** (URL unique)
2. LeadConduit inclut ce certificat dans les champs envoyés à la plateforme de distribution
3. Notre app **stocke** ce certificat sur la fiche lead pour conformité légale (preuve de consentement)

Nous n’avons pas besoin d’intégrer l’API TrustedForm côté réception si LeadConduit nous transmet déjà le certificat dans le webhook.

---

## 6. Boberdoo — pourquoi pas de formulaire d’inscription sur boberdoo.com ?

**Boberdoo.com** est le site **commercial** du fournisseur SaaS. Ce n’est pas l’instance du client.

Chaque client Boberdoo dispose de sa **propre instance white-label** :
- URL typique : `https://[nom-du-systeme].leadportal.com`
- Page d’inscription agents (si activée) : `https://[nom-du-systeme].leadportal.com/signup`

L’inscription publique est **par tenant**, configurée par l’admin du client, pas sur le site marketing Boberdoo.

### Ce que la cliente a montré

Dans le call, elle montre le **« New Client Form »** **à l’intérieur de leur instance Boberdoo** (pas sur boberdoo.com) :

| Sujet | Timestamp transcript |
|-------|---------------------|
| Agents créent leur propre compte via le formulaire | **19:30 – 19:42** |
| « New client form » → portail auto-créé | **19:42 – 20:04** |
| Champs : société partenaire, état, type IUL, sélection états | **20:13 – 20:41** |
| Carte Stripe + wallet à l’inscription | **06:00 – 06:15** |

### Call review #1 (29 juin 2026)

Transcript : `first review with client` — [enregistrement Fathom](https://fathom.video/share/Me72higENrw2eczj-y1LogKViv54jh45)

| Sujet | Décision |
|-------|----------|
| Inscription | Accès portail immédiat mais **non actif** ; carte ajoutable, pas de débit ni leads avant activation admin |
| Onboarding | Flow auth → formulaire onboarding → activation ; **édition des états** possible après activation (vs Boberdoo) |
| Filtres | **États uniquement** ; minimum **15 états** ; filtre horaire **abandonné** |
| Remboursements | Type A = rematch prix origine ; Type B = lead mort + buffer **15 %** |
| Architecture | **Pas de sous-domaines** par agence — mono-domaine confirmé |
| Prochaine étape | Démo app lundi suivant |

### Fonctionnalités Boberdoo à reproduire (hors aged leads)

- Partners / agents, filtres par état, priorité 1–10
- Wallet Stripe, statut actif/inactif
- Distribution automatique + emails
- Custom delivery CRM
- Resale IntegrityCONNECT (ping/post)
- Portail agent : leads, transactions, ajout de fonds

---

## 7. Modèle de données (orienté implémentation)

```
agents (users)
  ├── affiliation (texte libre — nom agence partenaire)
  ├── wallet_balance
  ├── filter_states[], lead_type, priority (1-10)
  ├── price_override (nullable, ex. 20 au lieu de 25)
  └── crm_webhook_url (nullable)

leads
  ├── contact fields, state, lead_type, source
  ├── trustedform_cert_url
  ├── received_at
  ├── available (boolean, default true)
  ├── refundable (boolean, default true — passe false après cycle remboursement+revente)
  └── status: unmatched | delivered | integrity_posted | aged_listed | ...

lead_deliveries                   -- historique (qui a reçu quoi)
  ├── lead_id, agent_id, channel, price, delivered_at, refunded_at

refund_requests                   -- workflow in-app
  ├── lead_delivery_id, agent_id, reason, refund_type (wrong_filter|invalid_phone)
  ├── status: pending|approved|rejected

transactions                      -- ledger wallet
  ├── agent_id, type, amount, balance_after, stripe_payment_id?, lead_delivery_id?

resale_postings                   -- envois IntegrityCONNECT
  ├── lead_id, mode (realtime|storefront), status, external_ref
```

**Matching V1 :** état US + type IUL + partner actif (wallet) + **≥ 15 états** + priorité. **Égalité de priorité → FIFO** (confirmé équipe).

**Filtres V1 :** sélection d’états **uniquement** — pas de filtre horaire.

**Auth :** Clerk — pas d’email avec mot de passe maison ; Clerk gère la connexion. Email de bienvenue optionnel.

**Domaine :** mono-domaine unique pour tous les agents (pas de sous-domaine par agence comme Boberdoo).

---

## 8. Stack technique

| Couche | Choix |
|--------|-------|
| Framework | **Next.js 14** (App Router) + TypeScript |
| UI | **Tailwind + shadcn/ui** |
| ORM | **Prisma** |
| Base | **Supabase PostgreSQL** (pas Docker local) |
| Auth | Clerk |
| Paiements | Stripe **mode test** d’abord — prod plus tard |
| Hébergement cible | Replit (après phase Netlify + Supabase) |
| Repo | GitHub → import Replit |

### Stratégie Supabase / Replit

- **Supabase** pour dev et staging — connexion directe via `DATABASE_URL`
- **Prisma** pour migrations et schéma versionné
- Pas de dépendance Supabase Auth / Realtime — Clerk pour l’auth
- Switch Replit = changer `DATABASE_URL` + `prisma migrate deploy`

---

## 9. État d’implémentation (juillet 2026)

> Détail technique : [`docs/BACKEND.md`](BACKEND.md) · Connexion LeadConduit : [`docs/LEADCONDUIT_SETUP.md`](LEADCONDUIT_SETUP.md)

### ✅ Livré

| Domaine | Statut |
|---------|--------|
| Repo, Next.js 14, Prisma, Supabase | ✅ |
| Auth Clerk (admin + partner séparés) | ✅ |
| Onboarding partner (≥15 états) + approbation admin | ✅ |
| `POST /api/leads/intake` (format Boberdoo, CORS, public) | ✅ |
| Pipeline intake : validate, normalize, doublons, TrustedForm, match, deliver | ✅ |
| Moteur matching v2 (filter sets, limites H/J, FIFO) | ✅ |
| Wallet Stripe (top-up + abonnement hebdo) + ledger | ✅ |
| Emails livraison (Resend), CRM webhook, Ringy | ✅ |
| Remboursements Type A/B (partner + admin) | ✅ |
| Marketplace aged (achat self-service) | ✅ |
| Cron reprocess unmatched + Integrity post (routes) | ✅ |
| Admin : dashboard, leads (vues sauvegardées, colonnes, export par vue), partners, refunds, settings, migration, filter list | ✅ |
| Partner : dashboard, leads (vues sauvegardées), wallet, aged, settings, contact, refunds | ✅ |
| Table `lead_list_views` + CRUD vues admin/partner | ✅ |
| Dev tools : `/dev/lead-simulator`, `/feeding-platform` | ✅ |
| Tables `lead_events`, `partner_filter_sets`, champs Boberdoo étendus | ✅ |

### ⏳ Restant / bloqué client

| Domaine | Statut |
|---------|--------|
| IntegrityCONNECT **live** (ping/post prod) | ⏸ specs/credentials client — mock en place |
| Stripe **prod** | ⏳ après validation test keys |
| Scheduler cron en prod (Vercel/pg_cron) | ⏳ config déploiement |
| Parité UI Boberdoo complète (charts, multi lead types, billing PDF) | ⏳ hors scope V1 |
| Cutover LeadConduit prod (URL Boberdoo → app) | ⏳ avec cliente |

### Priorité historique (semaine 1 — **terminé**)

- [x] Repo GitHub monorepo full-stack (React + Node)
- [x] Schéma BDD + migrations (partners, leads, wallets, transactions, filter sets, lead_events)
- [x] Auth Clerk avec rôles admin | partner
- [x] Shell UI Admin + shell Portail Partner
- [x] Flow onboarding agent + approbation admin

### Moteur métier (**terminé**)

- [x] Modèle `Lead` + endpoint `POST /api/leads/intake`
- [x] Moteur de matching (filter sets + priorité + wallet actif)
- [x] Statuts lead + file unmatched + retraitement 24 h (cron)
- [x] Débit wallet + ledger
- [x] Marketplace aged (seuil configurable)
- [x] Emails (Resend si clé configurée)

### UI fonctionnelle (**terminé — polish partiel**)

- [x] Dashboard admin (Operations) : filtre période en en-tête (`?period=` today \| yesterday \| last_7_days \| custom + `from`/`to` ; défaut last 7 days) ; KPIs leads/livraisons, graphiques intake + canal, leads récents filtrés ; compteurs agents actifs / unmatched (instantanés, hors période)
- [x] Admin leads : **vues** (ex-onglets statut seedés), switcher + éditeur, filtres date/état/recherche, colonnes configurables (vues), toggle cartes/tableau + colonnes masquables (`localStorage` `admin-leads-table-layout`, `admin-leads-visible-columns` ; parité liste admin partners), détail lead **B3** (hero compact, onglets Contact/IUL/Compliance/Tracking/Events, livraisons partenaires + timeline) ; `?view=` (redirection legacy `?status=`)
- [x] Partner leads : vues par partner (défaut « All deliveries »), mêmes primitives UI que l’admin côté liste
- [x] Admin partners : liste, approbation, détail **P5** (profil + conformité CRM : colonne résumé, stats, checklist, filter sets en lignes, activité unifiée ; édition compte (modal « Edit account » depuis l’en-tête ou Account & CRM ; avatar 96px sur la carte profil — photo Clerk si `Partner.clerkUserId` renseigné, sinon initiales du nom ; partenaires seed type « Dashboard Demo » sans compte Clerk lié)), filter sets ; filtre **Company** (`?company=`, valeurs = `Partner.affiliation` ; `?family=` encore lu) ; toggle cartes/tableau + colonnes masquables (`localStorage` `admin-partners-table-layout`, `admin-partners-visible-columns`)
- [x] Admin refunds : file pending + historique
- [x] Dashboard partner : stats, wallet Stripe, aged marketplace
- [x] Partner settings (états, CRM webhook)

### Stripe (**test — terminé**)

- [x] Top-up wallet Checkout + webhook
- [x] Abonnement hebdomadaire auto-recharge
- [ ] Clés prod client (après validation E2E)

### Tests sans accès client (**disponible**)

---

## 9.1 Stratégie de tests sans accès client

### Entrées (Meta / LeadConduit) — faut-il une URL Meta ?

**Non, pas pour démarrer.** Une URL Meta Lead Ad exige un compte **Meta Business Manager**, une Page Facebook, une campagne publicitaire et un formulaire Lead Ads lié — ce sont les accès de la cliente, pas les nôtres.

**Ce qu’on construit à la place :**

| Couche | Outil | Rôle |
|--------|-------|------|
| **Simulateur interne** | Page/form de test TECHMA (`/dev/lead-simulator`) | Formulaire simple → POST vers `/api/leads/intake` |
| **Feeding platform** | `/feeding-platform` | UI statique pour soumissions test |
| **Fixture JSON** | Fichiers `fixtures/lead-payload-*.json` | Payloads conformes au format LeadConduit attendu |
| **Script CLI** | `npm run seed:lead` ou curl | Injection en masse pour tester matching / aging |
| **Webhook mock** | `POST /api/leads/intake` | Endpoint identique à celui branché en prod |
| **TrustedForm simulé** | URL factice `https://cert.trustedform.com/test-{uuid}` | Suffisant en dev ; champ string en BDD |

**Optionnel plus tard (avec cliente)** : pointer un flow LeadConduit de **staging** vers notre URL de dev (ngrok / Replit dev URL). Pas besoin de Meta pour ça — LeadConduit peut recevoir de sources de test.

**Principe clé :** notre plateforme ne parle pas à Meta directement. Elle reçoit ce que **LeadConduit** envoie. On teste donc le **contrat webhook**, pas Meta.

### Sorties — tests sans credentials cliente

| Intégration | Mode test sans client | Accès nécessaire en prod |
|-------------|----------------------|--------------------------|
| **Stripe wallet** | Clés **test** (`sk_test_…`) — compte démo TECHMA ou `stripe sandbox create` | Clés prod client + webhook secret |
| **Emails** | Console log / [Mailtrap](https://mailtrap.io) / Resend dev | SMTP ou Resend prod client |
| **CRM agent** | [webhook.site](https://webhook.site) ou endpoint local `/api/dev/crm-capture` | URL webhook fournie par chaque agent |
| **IntegrityCONNECT** | **Mock server** qui répond aux ping/post avec `{ accepted: true }` | Doc API + credentials Integrity (fichier R client) |
| **LeadConduit réponse** | Retourner `{ "outcome": "success" }` sur notre endpoint | Idem |

**Pattern recommandé :** variable `INTEGRATIONS_MODE=mock|live` — en mock, toutes les sorties loggent localement ; en live, vraies APIs.

### Stripe (wallet prépayé)

Ce n’est **pas** Stripe Connect (pas de compte Stripe par agent). Pattern :

```
Agent paie via Stripe Checkout / Payment Element (mode test)
  → argent sur compte Stripe de la cliente (ou compte test TECHMA)
  → webhook Stripe → crédit wallet_balance en BDD
  → chaque lead livré → débit BDD uniquement (pas de nouvelle charge Stripe)
```

Recharges : **manuelle ponctuelle** ET **récurrente hebdomadaire** (confirmé cliente).

---

## 10. Dépendances client — blocages réels

> Liste minimale pour avancer sans déranger inutilement.  
> Demander en **un seul email groupé** au kickoff.

### 🔴 Bloquant pour mise en production (pas pour démarrer le dev)

| # | Besoin | Pourquoi | Quand nécessaire |
|---|--------|----------|------------------|
| 1 | **Accès LeadConduit** (ou doc webhook + exemple payload) | Brancher le vrai flux d’intake en prod | Cutover — voir [LEADCONDUIT_SETUP.md](LEADCONDUIT_SETUP.md) |
| 2 | **Exemple réel de payload lead** (avec champ TrustedForm) | Mapper les champs correctement | **Résolu** — fixture + exploration Boberdoo |
| 3 | **Compte Stripe production** (clés API + webhook secret) | Paiements réels agents | Semaine 4 |
| 4 | **Doc API IntegrityCONNECT** + credentials ping/post | Revente leads non matchés | Semaines 5–6 |
| 5 | **Accès instance Boberdoo** (lecture seule) | Valider parité fonctionnelle | Dès que possible (QA) |

### 🟡 Important mais pas bloquant immédiat

| # | Besoin | Pourquoi | Quand |
|---|--------|----------|-------|
| 6 | Charte graphique Integrity (logo, couleurs hex, font files) | Design final | Semaine 1–2 |
| 7 | Liste des **champs formulaire** onboarding agent | Parité avec Boberdoo | Semaine 1 |
| 8 | Règles de **prix par type** et remises partenaires confirmées | Config admin | Semaine 3 |
| 9 | CRM(s) cibles pour custom delivery (Ringy, HubSpot — lequel en priorité ?) | Intégration sortante | Semaine 5 |
| 10 | Contact Integrity pour questions API | Déblocage intégration | Semaine 5 |

### 🟢 Peut attendre la démo

| # | Besoin |
|---|--------|
| 11 | Accès Meta Ads Manager |
| 12 | Compte TrustedForm dédié (si LeadConduit envoie déjà le certificat) |
| 13 | Données historiques de leads à migrer |

### Message type au client (à adapter)

> Pour connecter la plateforme à votre flux réel, nous aurons besoin à terme de : (1) accès LeadConduit ou un exemple de payload webhook incluant le certificat TrustedForm, (2) vos clés Stripe, (3) la documentation API IntegrityCONNECT. En attendant, nous construisons le cœur de la plateforme (portails, matching, aged leads, wallet) avec des données de test — aucune action requise de votre côté cette semaine.

---

## 11. Planning indicatif

| Semaine | Focus |
|---------|-------|
| 1 | Setup, auth, BDD, shells UI, onboarding |
| 2 | Pipeline intake (mock puis réel), admin leads |
| 3 | Matching, wallet, notifications |
| 4 | Stripe + marketplace aged leads |
| 5–6 | IntegrityCONNECT, CRM, tests, déploiement Replit |

---

## 12. Fichiers sources du projet

| Fichier | Contenu |
|---------|---------|
| `docs/TECHMA - Lead Distribution Platform Proposal.md` | Proposition commerciale / scope détaillé |
| `docs/capital_solu_initial_call_transcript.txt` | Transcript call découverte client |
| `docs/team call.txt` | Briefing interne TECHMA (Bill, Masdouk) |
| `docs/PROJECT.md` | Mémoire projet / décisions / FAQ |
| `docs/LEADCONDUIT_SETUP.md` | Guide connexion LeadConduit / ngrok / cutover prod |
| `docs/PRD.md` | **Spécification produit** — features, flows, BDD, stack |

---

## 13. Contacts & ressources internes

- **Chef de projet** : Masdouk (masdouk@techma.ca)
- **Développeur assigné** : Bill (Osee Bill AHOGNONVI)
- **Stripe dev** : compte démo TECHMA
- **Référence design** : site Integrity Marketing (couleurs/fonts client)
- **Référence fonctionnelle** : instance Boberdoo client + Loom call Masdouk/client

---

## 14. Décisions validées (équipe — juin 2026)

### Ne pas demander à la cliente (non technique — sourcer en interne)

| Sujet | Source |
|-------|--------|
| Payload webhook / champs lead | Instance **Boberdoo** + accès **LeadConduit** quand disponibles |
| Doc API IntegrityCONNECT | Plateforme Boberdoo / fichiers existants côté client ; demander seulement si insuffisant |
| Format CRM custom delivery | Écrans **Boberdoo** (config agent) |
| Égalité de priorité | **FIFO** — partner inscrit le plus tôt en premier |
| Filtres matching V1 | **État + type IUL** uniquement ; **min 15 états** ; pas de filtre horaire |
| Plafond ventes aged | **Aucun** pour l’instant |
| Domaine | **Mono-domaine** pour tous |
| Email identifiants signup | **Non** — Clerk gère l’auth |
| Aged UX V1 | **Achat unitaire + checkboxes** ; panier plus tard |
| Tranches d’âge aged | **Plus tard** |
| Factures PDF | **Pas obligatoire** V1 |
| Recharge wallet | **Manuelle + récurrente** toutes les deux |

### Demander à la cliente

| Sujet | Quand |
|-------|-------|
| **Migration leads historiques** Boberdoo | **Oui** — feature livrée V1 même si import différé |
| **Approbation admin** après signup | **Oui** par défaut (comme Boberdoo) — désactivable via feature flag |
| **Frais de retraitement** (montant) | Plus tard, non urgent |
| **Clés Stripe prod** | Après phase test |

### Technique — résolu

- [x] **Prisma** (pas Drizzle)
- [x] **Supabase** dev (pas Docker)
- [x] **Next.js** full-stack
- [x] `INTEGRATIONS_MODE=mock|live` (app_settings)
- [x] Approbation admin après signup — `ADMIN_APPROVAL_REQUIRED`

### Juillet 2026 — backend core

| Sujet | Décision |
|-------|----------|
| Priorité build | **Backend core d'abord**, UI/design ensuite |
| Filter sets | **Multiples par partner** (parité Boberdoo), pas un seul profil |
| Auto-recharge solde | **Reportée** — abonnement Stripe hebdomadaire conservé |
| Admin vs partner | **Comptes séparés** — pas de promotion partner → admin |
| IntegrityCONNECT live | Code mock prêt ; **specs/API client** requises pour live |
| TrustedForm | Certificat dans le payload webhook ; pas d'accès admin TF requis pour intake |
| Seuil aged | Sera **configurable** en admin (défaut 30 jours) |
| Stripe | **Test keys d'abord**, prod après validation E2E |

Plan détaillé : [CORE_BACKEND_PLAN.md](CORE_BACKEND_PLAN.md)

---

## 15. Notes pour agents IA

Lors d’une reprise de contexte :
1. Lire ce fichier en premier
2. [BACKEND.md](BACKEND.md) — état technique actuel
3. [CORE_BACKEND_PLAN.md](CORE_BACKEND_PLAN.md) — travail backend restant (9 phases)
4. Consulter la proposition (scope contractuel)
5. `capital_solu_initial_call_transcript.txt` — call découverte
6. `first review with client` — review #1 (29 juin 2026)
7. `update_call_6-7` — démo client + débrief équipe (6 juil. 2026)
8. Le call équipe pour les décisions TECHMA (design prioritaire, Clerk, GitHub→Replit)
9. Ne pas confondre avec le **portail étudiant** (autre projet, 1 semaine)

---

## 16. Questions restantes (révisé v5)

### Cliente

| # | Question | Statut |
|---|----------|--------|
| C3 | Migration leads historiques Boberdoo ? | **Résolu : oui** |
| C14 | Validation admin après signup ? | **Résolu : oui** ; portail accessible avant activation |
| C15 | Égalité de priorité ? | **Résolu : FIFO** (décision équipe) |
| C16 | Buffer 15 % | **Résolu** : manuel seulement, parité Boberdoo |
| C17 | `available` pour aged ? | **Résolu** : non — aged = critère J+30, `available` reste `false` si vendu |
| C9 | Frais de retraitement ? | **Reporté** |
| C11 | Stripe prod ? | **Reporté** — test TECHMA d’abord |
| C18 | Partner modifie ses états ? | **Résolu : oui**, min 15 |
| C19 | Filtre horaire ? | **Résolu : non** |

### Interne TECHMA

| # | Action | Statut |
|---|--------|--------|
| I1 | Explorer Boberdoo | **Résolu** |
| I2 | Payload LeadConduit | **Résolu** |
| I3 | Charte Integrity | **En cours** — références dans docs |
| I4 | Stripe mode test | **Reporté** |
| I5 | Seuil 2 j remboursement | **Retiré** |
| I6 | Sous-domaines | **Résolu : non** |
| I7 | Stack Next.js + Prisma + Supabase | **Résolu** |
| I8 | Vocabulaire UI Partner | **Résolu** |

### 16.1 Ce que signifiaient C22 et C23 (clarification)

| Ancien # | Ce que ça voulait dire | Action |
|----------|------------------------|--------|
| **C22 « accès Boberdoo »** | Se connecter à l'**ancienne plateforme du client** (pas boberdoo.com) avec les identifiants déjà partagés par Masdouk, pour **voir les écrans** et reproduire les fonctionnalités. C'est un outil de **développement interne**, pas une question à poser à la cliente. | **100 % résolu** — `docs/BOBERDOO_EXPLORATION.md` (sessions 1–8) |
| **C23 « charte graphique »** | Les **éléments visuels** : logo Integrity, codes couleur bleu, police — pour que la nouvelle app **ressemble** à leur marque. Pas un document formel ; on peut les **extraire du site Integrity** qu’ils ont montré en call. | Sourcer depuis le site client / Boberdoo |

### Message kickoff client (révisé)

> Bonjour, nous avons démarré le développement de votre plateforme (portails admin et agents, distribution des leads, wallet, marketplace aged leads) avec des données de test. Pour la mise en production, nous aurons besoin de valider avec vous : (1) la **migration de vos leads historiques** depuis Boberdoo, (2) si les nouveaux agents doivent être **approuvés manuellement** après inscription, (3) vos **clés Stripe** quand nous passerons du mode test au mode réel. Nous vous tiendrons informés lors de nos démos hebdomadaires.

---

## 17. FAQ technique (synthèse)

| Sujet | Réponse courte |
|-------|----------------|
| URL Meta pour tests ? | **Non nécessaire** — simuler le webhook LeadConduit |
| Payload / champs lead ? | **Sourcer via Boberdoo/LeadConduit** — ne pas demander à la cliente |
| Tester sans accès client ? | Oui pour ~80 % (mock intake, Stripe test, CRM webhook.site, Integrity mock) |
| Disponibilité lead ? | **`available`** = temps réel ; aged = **J+30** sans toucher `available` |
| Remboursement | **In-app** ; type A → rematch prix origine ; type B → lead mort ; buffer 15 % type B |
| Filtres agent | **États uniquement** ; **min 15** ; édition self-service après activation |
| Après revente post-remboursement (type A) | **`refundable = false`** — plus de 2e remboursement |
| Aged leads UI V1 ? | Achat unitaire + **checkboxes** ; panier V2 |
| Demander à la cliente ? | Surtout **migration historique** + approbation signup + Stripe prod |

---

## 18. État implémentation (backend + UI)

> Détail technique : [`docs/BACKEND.md`](BACKEND.md) · LeadConduit : [`docs/LEADCONDUIT_SETUP.md`](LEADCONDUIT_SETUP.md)

**Juillet 2026 — V1 fonctionnelle en test :**

| Phase | Livrables clés | Statut |
|-------|----------------|--------|
| 0 — Fondations | Repo, Prisma, intake, matching v1, seed | ✅ |
| 1b — Auth + shells | Clerk, onboarding, admin/partner portails | ✅ |
| 2 — Pipeline | Intake complet, cron reprocess, Integrity mock | ✅ |
| 3 — Wallet | Stripe test, emails, CRM/Ringy delivery | ✅ |
| 4 — Aged + refunds | Marketplace, workflow remboursement | ✅ |
| Core backend (9 phases) | Filter sets, lead_events, admin APIs | ✅ |
| UI parité (essentiel) | Leads, partners, refunds, wallet, aged | ✅ |

**Prochaines étapes :** cutover LeadConduit prod, Integrity live, Stripe prod, scheduler cron prod, polish UI avancé (charts, billing PDF).

