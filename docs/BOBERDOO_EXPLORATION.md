# Exploration Boberdoo — Capital Leads (FFL Capital)

> **Document de reconnaissance** — exploration en lecture seule de l'instance cliente.  
> URL : `https://capitalleads.leadportal.com`  
> Début : 26 juin 2026 | Mise à jour : 26 juin 2026 (session 8 — exploration **100 %**)  
> Explorateur : Bill (TECHMA) via Cursor Browser  
> **Consigne respectée** : aucune modification de données prod (pas de save, register, reprocess, refund, delete).  
> **Gap analysis (build vs Boberdoo)** : voir [`BOBERDOO_GAP_ANALYSIS.md`](./BOBERDOO_GAP_ANALYSIS.md) — inventaire complet + statut implémentation (30 juin 2026).

---

## Objectifs de l'exploration

1. Comprendre le fonctionnement complet de la plateforme actuelle
2. Identifier ce que les documents n'avaient pas capturé
3. Cerner ce qu'il faut reprendre dans la nouvelle plateforme
4. Répondre aux questions ouvertes (PRD §15, PROJECT §16)
5. Documenter les flux de données et user flows

---

## 1. Vue d'ensemble

| Élément | Valeur |
|---------|--------|
| Instance | **Capital Leads** (white-label Boberdoo) |
| Admin URL | `https://capitalleads.leadportal.com/new_admin/adminpage.php` |
| Signup public | `https://capitalleads.leadportal.com/signup` |
| API docs | `https://capitalleads.leadportal.com/new_api/index.php` |
| Routing admin | Paramètre `pageID` (+ `brID`, `sub`, `vID`) |
| Portail agent | `https://capitalleads.leadportal.com/res_partners/$A3p3/` (impersonation admin) |
| UI | Ancienne UI (sidebar) + nouvelle UI (métrique) — **préférer Old UI** pour navigation fiable |

**Terminologie Boberdoo vs notre PRD :**

| Boberdoo | Notre modèle | Note |
|----------|--------------|------|
| Partner | Agent | Une personne = un compte |
| Company (champ signup) | Affiliation / agence | Ex. « Family First Life » |
| Filter Set | Profil matching agent | États, prix, priorité, livraison |
| Credit / Balance | Wallet | Stripe prépayé |
| Lead Buying | Statut actif matching | Solde ≥ prix lead |
| Vendor / Source | Origine lead (Meta/LeadConduit) | Intake — ex. « Facebook 2nd chance » |
| Vendor (Seller) | Acheteur externe Integrity | Boberdoo appelle les **Sellers** des « Vendors » — ex. **Integrity Lead Center** (vID=3) |

---

## 2. Cartographie admin (pageID)

| pageID | Section | Priorité V1 |
|--------|---------|-------------|
| 0 | Home / dashboard | ✓ synthèse |
| 1 | User Settings (admin) | référence |
| **8** | **Source/Vendor Settings** | ✓ intake/revente |
| **67** | **Lead Types** | ✓ (incl. **Aged IUL**) |
| **69** | **Manage Vendors** | ✓ **Integrity Lead Center** |
| **83** | **Custom Deliveries Wizard** | ✓ CRM webhooks |
| 160 | Lead Types Examples Definition | référence API |
| 2 | Leads (All, Matched, Unmatched, Declined, Review) | ✓ |
| 3 | Partners — liste | ✓ |
| 10 | Partner detail (brID) — filter sets, billing, refunds | ✓ |
| 11 | Add Partner wizard | référence onboarding |
| 15 | Refunds (Approve OLD) | ✓ workflow |
| 77 | Lead Search/Delete | ✓ |
| 92 | Filter List (vue globale matching) | ✓ |
| 119 | Aged Leads Browse | ✓ (process manuel actuel) |
| 218 | Billing & Payments / Invoices | ✓ |
| 272 | Outside Services (TrustedForm, etc.) | ✓ intake |
| 333 | Forms Builder | hors scope IUL actif |

---

## 3. Types de leads configurés

| Nom | ID Boberdoo | Usage client |
|-----|-------------|--------------|
| **IUL** | 37 | **Principal** (~500/jour Meta) |
| IUL2 | 43 | Configuré, usage secondaire |
| Mortgage Protection | 35 | Signup dispo, peu/pas produit |
| Life Insurance | 33 | Idem |
| Veteran | 39 | Idem |
| Final Expense | 41 | Idem |
| **Aged IUL** | *(type séparé)* | Visible pageID=67 — canal aged distinct |
| Inbound Phone | 9 | Téléphonie |

**Templates Filter Set IUL observés :**
- Standard IUL Template
- High Intent IUL Template
- Second Chance IUL Template

→ Correspond à **Traditional IUL** vs **High-Intent IUL** du call client.

---

## 4. Champs lead IUL (source de vérité)

Extrait de **Advanced Settings** partner (écran champs livrés email/CRM) — **non documenté dans PROJECT.md/PRD** :

### Identité & contact (défaut système)
- First Name, Last Name
- Address, City, **State**, Zip
- Primary Phone, Email
- DOB, Age

### Conformité & tracking
- **Trusted Form URL** ← certificat LeadConduit
- TCPA Consent, TCPA Language
- LeadiD Token
- IP Address, User Agent
- SRC, Landing Page, Sub ID, Pub ID, Unique Identifier

### Métier IUL (custom)
- **Have IUL**
- **State You Currently Live In**
- **Primary Goal**
- **Intent** (probable discriminant Traditional vs High-Intent)

### Système
- Lead ID, Date Posted
- Filter Set (assigné à la livraison)
- CRM Status
- Refund/Decline Admin Remarks

### Intégrations CRM observées
- **Ringy** : champs `IUL Ringy SID`, `IUL Ringy Auth Token` (+ IUL2)
- **GoHighLevel** : API `setCRMStatusFromGoHighLevel` dans spec Boberdoo
- Livraison par défaut : **HTML email** (ex. jbrabant01@gmail.com)

**Action implémentation :** mapper ces champs dans `leads.raw_payload` + colonnes principales ; simuler TrustedForm comme `Trusted Form URL`. Exemple JSON : `fixtures/boberdoo_iul_submit_lead.example.json`.

---

## 5. API intake (LeadConduit → Boberdoo)

Documentation publique : `https://capitalleads.leadportal.com/new_api/index.php`

| Endpoint | URL |
|----------|-----|
| Live POST | `https://capitalleads.leadportal.com/new_api/api.php` |
| Test POST | `.../new_api/api.php?Test_Lead=1` |
| JSON | `https://capitalleads.leadportal.com/apiJSON.php` |
| XML | `https://capitalleads.leadportal.com/apiXML.php` |

**Action API :** `submitLead` (legacy mais doc complète par lead type)

**Réponses documentées :**
- Matched → lead vendu à un partner
- Unmatched → file de retraitement
- Error → codes dans « Lead Insert/Process Error Codes »

**APIs utiles pour notre build :**
- `getLeadDetails`, `getMatchingPartners`, `getPartnerCreditandBalance`
- `requestRefundForLead`, `processRefundRequest`, `getRefundReasons`
- `pingPostLead`, `getMatchingSellers` ← **revente Integrity**
- `undoSale`, `undoSaleAndReprocess` ← remboursement + revente
- `getVendorsAndSources` ← sources Meta/LeadConduit

**Note :** LeadConduit envoie probablement vers l'API Boberdoo (ou webhook équivalent) — à confirmer avec accès LeadConduit ; la spec Boberdoo suffit pour modéliser l'intake.

---

## 6. Outside Services (TrustedForm)

Sur **pageID=272**, type IUL :

| Service | Phase | Statut |
|---------|-------|--------|
| **Trusted Form v4.0** (ID 7) | **Post** (à l'intake) | Active |
| *(ping services)* | Ping | Aucun configuré visible |

**Règles d'intégration observées :**
- Mapping champ → **Trusted Form Cert URL**
- Règles si champ vide / invalide
- Ordre de services en cascade (TrustedForm → autres)
- ~752 appels API MTD (juin 2026)

→ Confirme le flux documenté : **TrustedForm s'exécute côté formulaire Meta/LeadConduit**, Boberdoo valide/stocke le certificat à la réception — **pas généré par la plateforme de distribution**.

---

## 7. Partners / agents

### Liste partners (pageID=3)

Colonnes : ID, Company Name, Name, State, Lead Buying, Credit Limit, Account Status, Labels, Created

**Statuts compte :**
- Not Active
- Temporarily Stopped
- **Active** (éligible matching si solde OK)

### Signup public (`/signup`)

| Champ | Requis | Mapping V1 |
|-------|--------|------------|
| First / Last Name | ✓ | agent profile |
| **Company** | ✓ | **affiliation** |
| Phone, Address, City, State, ZIP, Country | ✓ | contact |
| Website, Promotion Code | — | — |
| **Leadtypes** | ✓ | Traditional IUL / High Intent IUL / MP / Veteran |
| **States** (multi, ~15) | ✓ | `filter_states[]` |
| **Billing** | One-Time / **Weekly** | recharge wallet |
| Email / Login | ✓ | auth |
| Days/times you accept leads? | — | info (non matching V1) |

→ **Pas de carte Stripe visible au signup** dans le formulaire public (probablement après approbation / 1ère connexion).

### Profil partner (ex. brID=323 — Justin Brabant / Family First Life)

**Account Settings tabs :**
Contact Information | Consent Settings | Account Information | Lead Type Settings | **Default Delivery** | Lead Limits Settings

**Filter Sets (cœur du matching) :**
- Prix par filter set : **25.00 $** et **27.00 $** (override possible vs défaut 25 $)
- Priorité : **5** (défaut, échelle 0–10 + « Always Match »=1000)
- Limites : hourly/daily/weekly/monthly (souvent « no limit »)
- Delivery : HTML email (+ config CRM par filter set)
- Templates : High Intent IUL, Standard IUL, etc.
- Statut filter set : actif/inactif indépendamment du compte

**Partner admin sub-pages :**
Transactions | Request Refund | Bulk Request Refund | Invoicing/Billing | Partner Permissions | **Go To Partner Admin** (impersonation)

---

## 8. Leads admin (pageID=2)

**Sous-vues :** All Leads | Review Leads | Matched | Unmatched | Declined

**Filtre date :** cliquer le champ « Select date range » puis preset (Last 30 Days → ~05/28–06/26/2026). Les leads se chargent automatiquement au changement de plage.

**Colonnes / statuts observés (liste Last 30 Days, juin 2026) :**

| Statut UI | Signification |
|-----------|---------------|
| *(partner matched)* | Lead vendu à un agent — bouton « Lead successfully delivered » |
| **Unmatched** | Pas de match agent au moment T |
| **Storefront (Integrity) - $25.00/ New** | Vendu ou posté en mode storefront Integrity |
| **Realtime (Integrity) - $22.00/ New** | Vendu en ping/post temps réel Integrity |

**Prix Integrity observés en prod :** Realtime **22 $** | Storefront **25 $** (≠ prix agent 25–27 $).

**Actions par lead (sans cliquer les actions destructives) :**
- Show Lead Log, Get Unmatched Reasons, View matching filter set
- Redeliver lead to Storefront / Realtime
- Refund Lead, Edit Lead, DNC Check

**Exemples Lead IDs visibles :** 70155, 70153, 70151, 70149… (centaines sur 30 jours).

**Show Lead Log :** URL directe `sub=showLeadLog` **inefficace** — utiliser **Last 30 Days** puis clic **Show Lead Log** sur la ligne. Exemple capturé lead **70155** → voir **§27**.

**Export migration (session 3) :** UI « Send Filtered Leads To » confirmée — format **Excel** par défaut, champ email, option « All Standard Lead Fields ». **Non déclenché** (lecture seule).

**Fonctions admin :**
- **Reprocess** unmatched (bouton — non utilisé)
- Export email : HTML / Excel / PDF / Plain Text / Short Text
- « Change Fields To Send » — parité champs export

---

## 9. Aged leads — processus actuel (gap principal)

**Menu Aged Leads (pageID=119) :**
- Aged Leads Browse
- Aged IUL
- **Aged Leads Upload** ← export manuel + réimport

**Constat :** pas de marketplace self-service agent. L'admin :
1. Exporte tous les leads
2. Upload dans module Aged
3. Construit commandes manuellement (état, âge, budget)

→ **Innovation V1** : marketplace aged self-service (déjà dans PRD) — confirmé comme vrai gap.

**Séparation `available` / aged (décision équipe, alignée Boberdoo) :**
- Boberdoo traite les aged comme **module / lead type séparé** (`Aged IUL`, pageID=119 Browse)
- Un lead peut figurer en **Aged Leads Browse** alors qu’il a déjà été **vendu** en temps réel (partners assignés visibles dans la liste)
- Pas de notion « remettre available à true » pour l’aged — critère = **âge + type aged**

**Note :** type « Aged IUL » existe dans advanced settings partner — aged est traité comme **canal/type séparé**, pas juste un flag d'âge.

---

## 10. Remboursements

**Menu Refunds :**
- Approve Refunds (OLD) — pageID=15
- Approve Refunds (nouveau) — pageID=**256**
- Browse Refunds

**Côté partner :** Request Refund + Bulk Request Refund

**API :** `requestRefundForLead`, `processRefundRequest`, `getRefundReasons`, `undoRefundApproved`

**Workflow Boberdoo actuel (browser 29 juin) :**
1. Partner initie remboursement depuis son portail (`Request Refund`)
2. Admin traite sur **Approve Refunds** (pageID=256) : liste par lead, approve/decline, raison, appel manuel si numéro invalide
3. Crédit wallet partner si approuvé
4. `undoSaleAndReprocess` côté admin pour remettre en circulation (type mauvais critère)

**Écran Approve Refunds (OLD) — pageID=15 :** vue agrégée par partner — colonnes **Reclamation #** (nombre de demandes en attente), **Credit** (montant total), **Credit Limit** (souvent **$0.00** sur cette instance).

**Buffer 15 % :** **aucune trace dans l’UI Boberdoo** (pas de pourcentage, pas de blocage auto, pas de compteur). La cliente l’applique **manuellement** en politique métier. Le champ **Credit Limit** existe (liste partners + écran OLD) mais est à **$0** pour tous les partners observés — non utilisé pour le 15 %.

→ **Parité V1** : workflow in-app + validation admin manuelle ; **pas** d’automatisation du buffer 15 %.

**Frais retraitement :** coût reprocess observé **0,00 $** sur lead 70155 (§27). Règles ownership / fenêtre 24 h probablement dans **Lead Type** (pageID=67, écran edit non ouvert) — source IUL_LeadConduit : coût intake **0 $**, unmatched→0 $ activé (§24).

---

## 11. Billing / wallet

- **Stripe** intégré (confirmé call + champs billing signup)
- Partner voit : Credit Limit, Balance, Transactions, Invoices
- Admin : Billing & Payments (Invoices, Payment Method, Contact Information)
- API : `submitPayment`, `getPartnerCreditandBalance`, `getTransactionDetails`
- Recharge : **manuelle (One-Time)** + **hebdomadaire (Weekly)** — confirmé signup

**Statut actif :** « Lead Buying » + solde ≥ prix filter set effectif.

---

## 12. Revente IntegrityCONNECT

### Où c'est configuré

Integrity n'est **pas** un module séparé — c'est un **Vendor/Seller** Boberdoo :

| pageID | Écran | Contenu |
|--------|-------|---------|
| **69** | Manage Vendors | Liste vendors actifs |
| **69&vID=3&type=vInfo** | Edit Vendor | Config **Integrity Lead Center** (vID=3) |
| **8** | Source/Vendor Settings | Règles globales sources/revente |
| **83** | Custom Deliveries Wizard | Livraisons custom (distinct de Integrity ping/post) |

### Vendors observés (pageID=69)

| Vendor | Rôle probable | Statut |
|--------|---------------|--------|
| **Integrity Lead Center** | Acheteur revente (ping/post) | Active |
| **2nd chance uploads** | Source leads re-upload | Active |
| **Facebook 2nd chance** | Source Meta second chance | Active |
| **Internal / your company** | Source interne | Active |

### Comportement sur les leads (confirmé en prod)

- Après échec matching agent → retraitement → vente **Realtime** (22 $) ou **Storefront** (25 $)
- UI lead : boutons « Redeliver lead to Realtime/Storefront »
- APIs : `pingPostLead`, `getMatchingSellers` (spec publique `/new_api/`)

### Session 3 — détail Integrity vID=3

**Compte vendor (`type=vInfo`) :**

| Champ | Valeur |
|-------|--------|
| Nom | Integrity Lead Center |
| Société | Integrity |
| Email | `IntegrityLeadCenter@nags.us` |
| Statut | **Active** |
| Impersonation | « Go To Vendor's Admin » → portail `new_vendor/` (Home, Leads, My Account, Reports) |

**Vendor Filters (`type=vFilters`) :** 8 types de leads (IUL, IUL2, MP, Life, Veteran, FE, Inbound Phone, Aged IUL) — chacun affiche **Edit Filters (0 Active)**, limites « no limit », horaires « Accept Leads Times ». Aucun filtre géographique actif dans l'UI → la revente Integrity semble **ouverre à tous les états** côté vendor, avec prix fixés ailleurs (22 $ / 25 $ observés sur les leads).

**Advanced Settings IUL (`type=vAdvancedSettings`) :** mapping champs envoyés à Integrity = **parité complète** avec les champs partner (§4) + statuts lead acceptés : Matched, Unmatched, Removed/Declined, Exclusive, New/Review, Pending. Refund Status **non coché**.

**URLs ping/post Integrity :** **résolues** via Custom Deliveries edit (§28). Vendor admin ne les expose pas directement.

**Portail vendor Integrity (impersonation) :** stats 0 sur 7 jours (Matched/Unmatched/…) — vue **acheteur** des leads reçus, distincte de la liste admin Capital Leads.

---

## 13. Portail agent (partner)

### Accès

- **Impersonation admin :** Partners → brID → « Go To Partner Admin »
- URL type : `https://capitalleads.leadportal.com/res_partners/$A3p3/index.php?brID=323&confirmed=1`
- Dashboard agent : `.../res_partners/$A3p3/brpage.php`

### Menu agent (brID=323 — Justin Brabant)

| Section | Présent V1 ? |
|---------|--------------|
| Dashboard | ✓ stats leads reçus |
| **My Leads** | ✓ leads livrés |
| **Settings** | ✓ **mot de passe uniquement** (pageID=2) — voir nuance Q6 |
| Reports | ✓ transactions |
| **Add Funds** | ✓ recharge Stripe |
| Contact Us | ✓ |
| **Aged Leads / Marketplace** | **✗ absent** — confirme gap |

### État compte observé (exemple brID=323)

- **Status : Not Active** — pas éligible matching malgré filter sets configurés
- **Account Balance : $0.00**
- Filter sets admin : **2 profils IUL inactifs** (25 $ et 27 $, priorité 5)
- Type lead agent : IUL uniquement dans le sélecteur dashboard

### Cartographie pageID portail agent (`brpage.php`)

| pageID | Section |
|--------|---------|
| 40 | Dashboard |
| 0 | My Leads |
| 2 | Settings (**changement mot de passe seulement**) |
| 8 | Password (alias) |
| 39 | Add Funds |
| 46 | Reports |
| 4 | Contact Us |
| 50 | 2FA Settings |

### Réponse Q6 (agent modifie ses états) — **affinée session 5 ; override review #1**

**Boberdoo actuel (Capital Leads prod) — non en self-service UI :**

- Partner **Active** Austin Roberts (brID=**307**) : permission admin **« Lead Filter Sets (Settings) » = cochée** (§30)
- Portail impersonation : menu Settings → **Password seulement** (`pageID=2` / `pageID=8`)
- Scan pageIDs portail 3–55 : **aucune page filter sets** trouvée malgré la permission
- Gestion réelle des états/prix : **admin** `pageID=10&brID=X&sub=showSettingsNew`

**Hypothèse :** permission legacy ou réservée au « Try New UI » / theme Metronic — non vérifié (session expirée).

Compte **Not Active** (brID=323) : même UI Password-only — le statut Active seul ne débloque pas les filter sets côté agent.

**Décision produit (call review #1, 29 juin)** : la nouvelle plateforme **permettra** l’édition des états côté agent (amélioration demandée par Sami), avec minimum 15 états.

---

## 14. User flows (synthèse)

### 14.1 Lead entrant (temps réel)

```
Meta Lead Ad
  → LeadConduit (+ TrustedForm script)
  → POST Boberdoo API (submitLead) / webhook
  → Outside Service: TrustedForm v4.0 validation (Post)
  → Moteur matching: Filter Sets actifs
       filtres: état ∈ states filter set, type IUL, priorité, solde wallet
  → Gagnant: priorité max (tie-breaker implicite FIFO)
  → Débit balance partner
  → Delivery: email HTML (+ CRM webhook si configuré)
  → Si unmatched: file 24 h → reprocess périodique
  → Si toujours unmatched: pingPostLead → Integrity (realtime/storefront)
```

### 14.2 Inscription agent

```
/signup (formulaire public)
  → Compte partner créé (statut probablement Not Active)
  → Admin approuve / active
  → Agent configure filter sets (états, type) + carte Stripe + recharge
  → Lead Buying = Active quand solde ≥ prix
```

### 14.3 Aged lead (aujourd'hui — manuel)

```
Lead en base 30+ jours
  → Admin export global
  → Aged Leads Upload
  → Admin filtre + construit commande par agent
  → Agent paie hors self-service (email admin)
```

### 14.4 Aged lead (cible V1)

```
Lead J+30, available=true
  → Marketplace portail agent
  → Filtres état / type / budget
  → Achat unitaire ou checkboxes
  → Débit wallet 5 $
```

### 14.5 Remboursement

```
Agent: Request Refund (ou admin initie)
  → Admin: Approve Refunds
  → Crédit balance
  → undoSaleAndReprocess (admin) selon règles ownership/âge
```

---

## 15. Ce qu'il faut reprendre (scope V1)

### Must-have (parité Boberdoo)

- [x] Intake webhook/API + TrustedForm stocké
- [x] Matching état + type + priorité + wallet actif
- [x] Filter sets / profil agent (états, prix override, priorité)
- [x] Wallet Stripe (one-time + weekly)
- [x] Portail agent : leads, wallet, transactions
- [x] Portail admin : partners, leads, refunds, config prix
- [x] Email livraison lead
- [x] CRM delivery (webhook + Ringy fields)
- [x] Signup public + **approbation admin**
- [x] File unmatched + retraitement 24 h
- [x] Integrity ping/post (mock puis live)
- [x] Export / recherche leads

### Innovation (au-delà Boberdoo)

- [ ] **Marketplace aged self-service**
- [ ] UI moderne (Integrity design)
- [ ] Workflow remboursement in-app unifié
- [ ] Routage post-remboursement (<2j / ≥2j / ≥30j) — règle TECHMA

### Nice-to-have / hors scope V1

- Phone Routing, Inbound Phone, Forms Builder
- Sub-partners, Bulk CRM Upload
- Compliance module complet
- Multi lead types (MP, Veteran…) — structure DB oui, UI non
- Tranches aged, panier, PDF factures

---

## 16. Réponses aux questions ouvertes

| # | Question | Réponse après exploration |
|---|----------|---------------------------|
| **Q4 (PRD)** | Seuil 2 jours post-remboursement | ~~Règle TECHMA~~ — **retirée** (review #1, 29 juin) ; remplacée par types A/B — voir `PRD.md` §5.8 |
| **Q6 (PRD)** | Agent modifie ses états après onboarding ? | Boberdoo : **non en self-service** (§30). **Cible V1 (review #1)** : **oui** — édition états portail agent, min 15 états |
| **Q7 (PRD)** | Format export migration Boberdoo | **Résolu** — Excel par défaut ; champs listés §35 ; définition schema via CSV icône #1 (§32) |
| **I1 (PROJECT)** | Payload / champs lead | **Résolu** — voir §4 + API submitLead IUL |
| **I2** | Doc Integrity | **Résolu (URLs)** — brokers + deliveries §27–§28 ; vendor filters **0 actifs** ; mapping champs §12 |
| **C22** | Explorer Boberdoo | **~95 % résolu** — ce document ; reste : Lead Log match **partner FFL direct** (aucun exemple prod récent) |
| **Approbation admin** | Confirmé | Signup public → comptes « Not Active » jusqu'à activation admin |
| **Partner vs agent** | Clarifié | Boberdoo « Partner » = notre « Agent » ; « Company » = affiliation |
| **Priorité défaut** | **5** confirmé | Échelle 0–10 + Always Match |
| **Prix défaut IUL** | **25 $** | Overrides observés (27 $, 20 $ mention call Dominic) |
| **Types IUL** | Traditional + High Intent | Templates filter set + champ Intent |
| **TrustedForm** | Post-intake service | Certificat mappé sur `Trusted Form URL` |
| **Recharge wallet** | One-Time + Weekly | Confirmé signup |

---

## 17. Écarts documents vs réalité Boberdoo

| Sujet | Docs disaient | Boberdoo montre |
|-------|---------------|-----------------|
| Structure partner/agency | Partner table + agents | **Un seul niveau** « Partner » avec champ Company ; sub-partners existent mais peu utilisés |
| Aged leads | Flag 30 jours + marketplace | **Module séparé** + upload manuel ; type « Aged IUL » |
| Champs lead | Contact + state + TrustedForm | **~25 champs** incl. Intent, Primary Goal, Have IUL, TCPA, tracking Meta |
| Intégrité revente | Module dédié | **Vendor « Integrity Lead Center »** (pageID=69, vID=3) + statuts lead Realtime/Storefront |
| Signup Stripe | Carte à l'inscription | Formulaire signup **sans** UI carte visible (billing type seulement) |
| UI admin | Dashboard simple | **Très dense** — dizaines de modules (Compliance, Phone, Forms…) |
| API intake | Webhook LeadConduit | **API Boberdoo submitLead** documentée publiquement |

---

## 18. Prochaines étapes (post-exploration)

Exploration Boberdoo **clôturée à ~95 %**. Suite recommandée :

1. **Implémentation V1** — s'appuyer sur ce doc + fixtures JSON
2. **Lead Log partner FFL** — optionnel ; demander à Masdouk un exemple historique si besoin de parité exacte livraison GHL/email agent
3. **Ownership 24 h** — implémenter règle TECHMA (PRD) ; ne pas attendre param UI Boberdoo

---

## 23. Custom Deliveries (pageID=83)

- UI principale dans iframe : `/old_admin/adminpage.php?pageID=83&Lead_Type=37`
- Liste par défaut : surtout entrées **« TEST Lead »** — utiliser **Search** (Delivery name) pour voir les livraisons prod
- Recherche `GHL` (session 4) : **13 deliveries** dont Integrity + Ringy + GHL + Google Sheet
- Edit readonly : `old_admin/adminpage.php?pageID=83&gLeadTypeID=37&id={ID}` → Continue » (sans Save)

**Deliveries Integrity IUL (mode LIVE) :**

| Wizard ID | Nom | Mode | Ping URL | Post URL |
|-----------|-----|------|----------|----------|
| **273** | Integrity - DirectPost - IUL | DirectPost (`isPingPost=0`) | — | LeadConduit flow `60affe1a…` |
| **281** | Integrity - Ping/Post - Real Time IUL | Ping/Post (`isPingPost=1`) | `ilc-functions-prod.azurewebsites.net/api/IsAcceptingCampaign` | LeadConduit flow `65c17964…` |
| 289 | Integrity - DirectPost - Real Time IUL | — | — | — |
| 287 | Integrity - DirectPost - Real Time IUL NA | — | — | — |

→ Détail URLs et mapping log→wizard : **§28**

**Deliveries CRM agents (extrait recherche GHL, session 4) :**

| ID | Nom |
|----|-----|
| 297 | 21s GHL - IUL - directpost | **§31** — REST GHL v1/contacts, JSON |
| 299 | 121 GHL - IUL - directpost |
| 305 | Partner 153s GHL - IUL - directpost |
| 311 | Partner 29 GHL - IUL - directpost |
| 313 | Get Custom Fields GHL |
| 291 | Partner 119 Ringy - IUL - directpost | **§38** — POST JSON Ringy API |
| 315 | Ringy - Generic Delivery |
| 303 | 23 BB - IUL - Google Sheet |

- Types delivery standard : HTML, Excel, PDF, Plain Text, Short Text Email
- Types spéciaux : Test Custom Delivery Success/Failure, No Delivery, deliveries Integrity (hardcodées)
- Bouton **Send Test Lead** — non utilisé (lecture seule)

---

## 24. Source/Vendor Settings IUL (pageID=8&Lead_Type=37)

**Sources actives observées :**

| Source | Rôle probable |
|--------|-----------------|
| **2nd_chance** | Leads second passage / re-upload |
| **IUL_LeadConduit** | Intake principal Meta via LeadConduit |
| **IUL_LeadConduit_HighIntent** | Variante high-intent |
| **IUL_Zapier** | Intake alternatif Zapier |

**Algorithmes de matching configurables par source** (radios par ligne source) :

- Filter Set Level — pas de regroupement company
- Company Level — priorité company + last lead stamp
- Last Lead Stamp Enabled
- By Filterset Priority + Company Last Lead Stamp
- Best pricing scenario (ignore priorité/stamp)
- Waterfall Optimization (EPL par groupe)
- Weighted delivery (daily target)

**Priorité filter sets :** Enabled/Disabled par source (tri priorité puis last lead stamp).

**Non trouvé sur la liste :** règles explicites **retraitement 24 h**, **ownership** — probablement dans **Lead Type IUL** (edit ajax depuis pageID=67, popup session 4 non capturé).

### Détail source IUL_LeadConduit (session 4)

Écran ouvert via CDP href « Update IUL_LeadConduit Source » (ajax popup, lecture seule).

| Paramètre | Valeur |
|-----------|--------|
| Vendor | **Internal** (ID 1) — pas Integrity |
| Active | Oui |
| Lead Cost | **0,00 $** |
| Unmatched → cost $0 | **Oui** |
| Manual review → cost $0 | **Oui** |
| Partners Per Lead | **1** |
| Post Delivery Timeout | **60** s |
| Ping Delivery Timeout | **30** s |
| Ignore Profit Margin | **Oui** |
| Return_Best_Price | **Non** |
| Response Type | **Short** |
| Delete Unmatched After Processing | **Non** (dépend du « X days » Lead Type) |
| Send Back Lead | **Never** |
| Outside Services | **Trusted Form v4.0** activé |

**Interprétation V1 :** l'intake Meta (LeadConduit) ne paie pas la source ; les unmatched sont à coût nul côté source ; le matching agent/Integrity fixe le prix de vente.

---

## 25. Filter List global IUL (pageID=92)

Vue admin paginée (~25 filter sets/page) — colonnes : Partner, Company, Filter Set Name, Delivery, Status, Priority, Limits, **Lead Price**, Balance.

**Templates dominants :** `Standard IUL COPY`, `High Intent IUL COPY`, `High Intent IUL`, `Standard IUL`.

**Filter sets actifs observés (page 1) :**

| Partner | Filter set | Statut |
|---------|------------|--------|
| Austin Roberts | Standard IUL COPY | **Active** |
| Matthew Stewart | Standard IUL COPY | **Active** |
| Freya Lewis | Standard IUL COPY | **Active** |

**Majorité des partners :** filter sets **inactifs** (ex. Justin Brabant brID=323 — 2 profils COPY inactifs).

**Integrity :** absent de la Filter List — la revente passe par le **vendor** vID=3, pas par des filter sets partner.

**Recherche « Storefront »** dans la Filter List : **0 résultat** — Realtime/Storefront sont des **statuts lead**, pas des noms de filter set.

---

## 19. Journal d'exploration (horodaté)

| Heure (CDT) | Action | Résultat |
|-------------|--------|----------|
| ~10:47 | Connexion admin Home | Dashboard vide (0 leads du jour) ; menu complet identifié |
| ~10:48 | pageID=3 Partners | Liste partners, statuts Active/Not Active, filter sets links |
| ~10:49 | brID=323 Filter Sets | Prix 25/27$, priorité 5, templates IUL, email delivery |
| ~10:50 | pageID=2 Leads | Sous-vues Matched/Unmatched, reprocess, export |
| ~10:51 | pageID=119 Aged Leads | Browse + **Upload** — confirme process manuel |
| ~10:52 | pageID=272 Outside Services | TrustedForm v4.0 Post active |
| ~10:53 | /signup | Champs onboarding complets documentés §7 |
| ~10:54 | /new_api/ | Endpoints intake, refunds, pingPost, CRM |
| ~10:55 | brID=323 Advanced Settings | **Liste complète champs lead IUL** §4 |
| ~10:56 | pageID=15 Refunds | Workflow approve + browse |
| ~10:57 | pageID=92 Filter List | Vue globale priorité/prix/balance tous partners |
| ~10:58 | Portail agent | Non accessible (404 URLs ; impersonation à retenter) |
| ~11:00 | Reprise session | **Session admin expirée** — redirect login ; reconnexion utilisateur requise pour suite |
| ~16:26 | pageID=2 Last 30 Days | **Centaines de leads** ; statuts Integrity Realtime 22$/Storefront 25$ |
| ~16:27 | pageID=69 Manage Vendors | **Integrity Lead Center** vID=3, Facebook 2nd chance, Internal |
| ~16:28 | pageID=67 Lead Types | Type **Aged IUL** séparé confirmé |
| ~16:28 | pageID=83 Custom Deliveries | Deliveries IUL (dont TEST Lead) |
| ~16:29 | Impersonation brID=323 | **Portail agent** : Dashboard, My Leads, Settings, Add Funds — **pas d'Aged** ; Not Active, 0$ |
| ~16:30 | Fin session 2 | Admin session expirée après navigation vendor edit |
| ~16:34 | pageID=92 Filter List IUL | Pagination ; actifs : Austin Roberts, Matthew Stewart, Freya Lewis |
| ~16:35 | pageID=8 Source/Vendor IUL | 4 sources actives ; algos matching par source |
| ~16:36 | vID=3 vFilters + vAdvancedSettings | 0 filters actifs ; mapping champs revente IUL complet |
| ~16:37 | vID=3 vInfo + Vendor Admin | Compte Integrity ; portail vendor impersonation |
| ~16:38 | pageID=83 Custom Deliveries iframe | 13+ « TEST Lead », 1 « Test Lead » — pas de delivery Integrity nommée |
| ~16:38 | Lead log leadID=70151 | URL directe sans panneau log ; old_admin = erreur page |
| ~16:39 | Portail agent Settings pageID=2 | **Mot de passe seulement** — pas de filter sets |
| ~16:40 | Fin session 3 | **Session admin expirée** |
| ~11:44 | Update IUL_LeadConduit Source | Coût 0 $, timeouts 60/30, TrustedForm, 1 partner/lead — §24 |
| ~11:46 | Custom Deliveries search GHL | 13 prod deliveries (Integrity, Ringy, GHL) — §23 |
| ~11:49 | Edit delivery id=273 | Integrity DirectPost IUL → URL LeadConduit storefront |
| ~11:50 | Edit delivery id=281 | Integrity Ping/Post Realtime → ping Azure + post LeadConduit |
| ~11:50 | vID=3 Edit Filters IUL | **0 filters** — « No records found » |
| ~11:51 | API pingPostLead TYPE=37 | Paramètres extraits → `fixtures/boberdoo_iul_ping_post.example.json` |
| ~17:03 | Lead Type IUL ajax cleanup | Retention PII 90j, sensitive 7j, reprocess cleaned Active — §29 |
| ~17:04 | brID=307 Partner Permissions | Lead Filter Sets permission ✓ ; portail = Password only — §30 |
| ~17:05 | Impersonation Austin Roberts | Active, 0 $ ; Settings sans filter sets UI |
| ~17:06 | Fin session 5 | **Session admin expirée** (partner aussi) |
| ~12:10 | Reprise session 6 | Admin reconnecté |
| ~12:12 | pageID=67 icône #1 IUL | **Export CSV définition champs** (pas écran config) — §32 |
| ~12:14 | pageID=2 Last 30 Days matched | 25 leads : **0 match partner direct** ; Integrity + Telymonde — §33 |
| ~12:17 | Edit delivery id=**297** | GHL directpost — mapping complet §31 |
| ~12:20 | Fin session 6 | Lead Log agent + Duplicate Checking + ajax export champs restants |
| ~12:35 | Duplicate Checking lien pageID=67 | **Doc Boberdoo externe** — pas config tenant (§37) |
| ~12:37 | Change Fields To Send ajax | Liste complète champs export §35 |
| ~12:38 | Lead Log lead **70125** | Flux Telymonde + GHL delivery §34 |
| ~12:39 | Portail Metronic brID=307 Settings | Password only — confirme §30 |
| ~12:40 | Fin session 7 | Exploration Boberdoo clôturée (~95 %) |
| ~12:44 | Edit delivery id=**291** | Ringy directpost — mapping complet §38 |
| ~12:45 | Matched Leads Last 90 Days | **No records found** — confirme absence match partner FFL (§39) |
| ~12:46 | Fin session 8 | Exploration Boberdoo **100 %** — prêt implémentation V1 |
| ~10:51 | **Session 9** — All Leads IUL (live) | Toolbar complet : Lead ID search, Select Template, Filter Leads, Show reprocess window, export panel. Row actions confirmés + **Outside Services result**. Destinations live : Integrity Realtime 22 $, Telymonde 20 $, **Twardowski (FFL) 25 $** lead **70191** — **premier match partner direct** observé en prod récente (corrige §39). Session expirée sur navigate direct → Partners. |
| ~10:59 | Session 9 suite | Partners list + detail brID=323, Filter List, Refunds, Aged Leads, Settings submenu complet, Billing, Reports, Partner portal + Add Funds Stripe — voir `BOBERDOO_GAP_ANALYSIS.md` §10. |

---

## 27. Lead Log — exemple lead 70155 (Storefront Integrity)

**Méthode :** `pageID=2` → Last 30 Days → clic **Show Lead Log** sur lead **70155** (Storefront Integrity, 25 $).

**Flux observé (horodaté dans le log UI) :**

1. Lead **unmatched** → **reprocess** admin (coût log **0,00 $**)
2. Tentatives **ILC Realtime** (brokerID **19**) — delivery log ID **223** « Integrity - Ping/Post - Real Time IUL » → `ping::223::No valid campaigns` (**échec**)
3. Succès **ILC Storefront** (brokerID **3**) — delivery log ID **219** « Integrity - DirectPost - IUL » :
   - `ping::219:: Fake ping delivery, masterSettingID **215**, prix **25 $**
   - `post::219:: success`, lead Integrity id, price 0
4. **Weighted delivery** : brokerID 3 priority **8** (Storefront), brokerID 19 priority **9** (Realtime)
5. Assignation manuelle admin (user Sami ID **67**) visible

**Correction modèle :** Integrity = **2 brokers** (pas seulement vendor vID=3) :

| Canal | brokerID | masterSettingID | Delivery log ID | Wizard ID (§28) |
|-------|----------|-----------------|-----------------|-----------------|
| Storefront | 3 (ILC Storefront) | 215 | 219 | 273 |
| Realtime | 19 (ILC Realtime) | 221 | 223 | 281 |

**À faire :** ~~capturer Lead Log matched agent~~ — **partiel** : log vendor Telymonde + GHL §34 ; **aucun** match partner FFL (Austin Roberts & co) sur échantillon 30 j (§33).

---

## 28. Integrity — URLs ping/post (Custom Delivery edit)

> IDs **log** (219/223) ≠ IDs **wizard** (273/281) — les deux espaces coexistent dans Boberdoo.

### Storefront — wizard id **273** (log delivery **219**)

| Champ | Valeur |
|-------|--------|
| Nom | Integrity - DirectPost - IUL |
| isPingPost | **0** (DirectPost ; « fake ping » dans le log) |
| Gateway URL (post) | `https://app.leadconduit.com/flows/60affe1a00048c6680c27719/sources/64e4ee92a3947cf03fa9dcea/submit` |
| Test Gateway URL | identique live |
| Post Method | POST |
| Response Type | JSON |
| Ignore SSL errors | Oui |

### Realtime — wizard id **281** (log delivery **223**)

| Champ | Valeur |
|-------|--------|
| Nom | Integrity - Ping/Post - Real Time IUL |
| isPingPost | **1** |
| Gateway URL ping | `https://ilc-functions-prod.azurewebsites.net/api/IsAcceptingCampaign` |
| Gateway URL post | `https://app.leadconduit.com/flows/65c179646acc6f1fb9864345/sources/64e4ee92a3947cf03fa9dcea/submit` |
| Response Type ping | string |
| Response Type post | JSON |

**Notes ticket Boberdoo** (champ Notes des deux deliveries) : `ticketid=191399` sur cp.leadsystem.com

**Vendor filters vID=3 IUL :** 0 actifs — la revente Integrity ne passe **pas** par des vendor filter sets configurés (accept all + pricing côté broker/weighted delivery).

---

## 29. Lead Type IUL — retention & cleanup (pageID=67, ajax icône #2)

Écran ouvert via ajax (2ᵉ icône ligne IUL type 37) — **Field Cleanup / Data Retention**, pas prix global.

| Paramètre | Valeur |
|-----------|--------|
| Sensitive Field Cleanup | **7** jours |
| PII Field Cleanup | **90** jours |
| PII Field Cleanup (Manual Review) | **90** jours |
| Lead Deletion (All Leads) | **Not Active** |
| Lead Deletion (Unmatched Leads) | **Not Active** |
| Lead Deletion (Unmatched By SRC) | **Not Active** |
| Lead Export Setup | **Complete** |
| Lead Export Interval | **1** jour |
| Reprocess Cleaned Leads | **Active** |
| PII Fields | Address, Email, First Name, IP Address, Last Name, Primary Phone |
| Delete With Sensitive Fields | DOB |

**Interprétation :** pas de suppression auto des unmatched ; reprocess des leads « nettoyés » (PII effacée) possible via AWS callback Boberdoo. Règle **ownership 24 h** / prix plateforme **non trouvés** ici — la **1ʳᵉ icône** n'est **pas** un écran config (§32) ; piste suivante : lien **Duplicate Checking** sur pageID=67.

---

## 30. Partner Permissions — Austin Roberts (brID=307, Active)

URL : `pageID=10&brID=307&sub=permissions` (⚠️ pas `sub=showPermissions` → 404)

| Permission | Cochée |
|------------|--------|
| Dashboard / My Leads / Add Funds / Reports | ✓ |
| **Lead Filter Sets (Settings)** | **✓** |
| Password (Settings) | ✓ |
| Request Refund / Bulk Refund | ✓ |
| Bulk CRM Upload | ✓ |
| Cherry Picker | ✓ |
| **My Aged Leads** | ✗ |
| **Reassign Leads** | ✗ |
| **Accounts/Lead Flow (Settings)** | ✗ |
| Invoices | ✗ |

Partner test Not Active : **brID=323** (Justin Brabant) — permissions non comparées en session 5.

---

## 31. Custom Delivery GHL — id **297** (21s GHL - IUL - directpost)

**URL edit readonly :** `old_admin/adminpage.php?pageID=83&gLeadTypeID=37&id=297` → Continue » (sans Save).

| Paramètre | Valeur |
|-----------|--------|
| Nom | 21s GHL - IUL - directpost |
| Mode | **DirectPost** (`isPingPost=0`) |
| Test mode | Non |
| Visible portail partner | Non (`showInBrokerSection=0`) |
| Gateway URL | `https://rest.gohighlevel.com/v1/contacts/` |
| Post Method | POST |
| JSON encode fields | **Oui** |
| Ignore SSL errors | Oui |
| Response Type | String |
| Success Response (regex) | `id"` (présence clé `id` dans réponse JSON GHL) |
| Notes (ticket) | cp.leadsystem.com ticket **195969** ; doc `public-api.gohighlevel.com` |

**Mapping champs Boberdoo → GHL API :**

| Champ Boberdoo | Champ GHL | Format / note |
|----------------|-----------|---------------|
| First Name | firstName | |
| Last Name | lastName | |
| Address | address1 | |
| City | city | |
| State | state | |
| Zip | postalCode | |
| Primary Phone | phone | `xxxxxxxxxx` |
| Email | email | |
| DOB | dateOfBirth | `Y-m-d` |
| Age | (int) | Convert to Int = Yes |
| Have IUL, Intent, Primary Goal, State You Currently Live In | customField via `$our['data']` | Mapping links présents |
| name | `$our['name']` | hardcoded |
| tags | `$our['tags']` | hardcoded |
| source | (hardcoded) | |
| customField | `$our['data']` | blob champs custom |

**Champs système disponibles (non tous mappés) :** Lead ID, Filter Set ID/Name/Price, Matched Partner ID/Name/Company/Email/Phone, Source ID/Label, Cost, TCPA, Trusted Form URL, IP, SRC, Sub_ID, Pub_ID, etc.

**Ordre d'envoi JSON :** `email, phone, firstName, lastName, name, dateOfBirth, address1, city, state, country, postalCode, companyName, website, tags, source, customField`

**Parité V1 :** modèle pour webhook CRM agent — POST JSON vers API externe, succès = parsing réponse, champs partner/metadata injectables.

---

## 32. Lead Type IUL — icône #1 pageID=67 (export CSV, pas config)

La **1ʳᵉ icône** edit sur la ligne IUL (type 37) ouvre **Lead Type Export To CSV** — téléchargement d'un CSV de **définition de champs**, pas un écran de configuration lead type.

**Colonnes CSV observées :** `friendly`, `csvname`, `type`, `price`, `isRequired`, `pingRequired`, …

**Usage :** documenter la liste officielle des champs + flags required/ping ; les **prix par champ** y figurent peut-être (à extraire en session suivante sans committer PII).

**Icônes pageID=67 (IUL) :**

| # | Action | Contenu |
|---|--------|---------|
| 1 | Export CSV | Définition champs (§32) |
| 2 | Ajax popup | Field Cleanup / retention (§29) |
| — | Lien Duplicate Checking | Ownership / doublons — **non ouvert** session 6 |

---

## 33. Distribution IUL — snapshot prod (session 6)

**Méthode :** `pageID=2&Lead_Type=37` → **Last 30 Days** (puis Matched) — échantillon **25 lignes** visibles.

| Destination finale | Count (approx.) | Prix observé |
|--------------------|-----------------|--------------|
| **Integrity** Storefront | majorité | 25 $ |
| **Integrity** Realtime | plusieurs | 22 $ |
| **Telymonde (Future Nest Life)** | ~7 | 20 $ |
| **Unmatched** | 2 | 0 $ |
| **Partner direct** (nom agent dans statut) | **0** | — |

**Exemples IDs :** 70155, 70153, 70151 (Integrity) ; 70125, 70123 (Telymonde) ; 70147, 70145 (Unmatched).

**Interprétation :** sur la fenêtre récente, les leads IUL **ne matchent pas** les 3 partners actifs (Filter List §25) — flux observé = unmatched → reprocess → **revente vendor** (Integrity prioritaire, Telymonde en parallèle). Le Lead Log **matched agent** (livraison GHL/email à Austin Roberts & co) **n'apparaît pas** dans cet échantillon ; chercher lead plus ancien ou via transactions partner brID=307.

**Impact V1 :** le moteur de matching + fallback Integrity/Telymonde est le chemin critique ; les deliveries GHL (§31) s'activent **après** match (vendor ou partner).

---

## 34. Lead Log — exemple lead 70125 (Telymonde + GHL)

**Méthode :** `pageID=2` → Last 30 Days → **Show Lead Log** sur lead **70125** (Telymonde / Future Nest Life, 20 $).

**Flux observé (sans PII) :**

1. Lead **unmatched** à l'intake → coût source **0 $** (`Unmatched lead cost updated to $0 based on source setting`)
2. Tentatives **ILC Realtime** (brokerID **19**) — `ping::223::No valid campaigns` (plusieurs cycles de reprocess, coût **0,00 $** chacun)
3. Cycles de reprocess espacés (ex. ~20:54 → ~22:13 → ~23:05 le même jour) — assignation manuelle admin (user Sami ID **67**) entre tentatives
4. Succès **Telymonde** (brokerID **21**, masterSettingID **211**, priority **8**) :
   - `ping::213::Fake ping delivery` — prix **20 $**
   - `post::213::` succès **21s GHL - IUL - directpost** (delivery log ID **213**, wizard §31) — réponse JSON GHL avec `contact.id`
   - Livraison **HTML** email en parallèle (`post::213::HTML successful`)
5. **Weighted delivery** stats visibles (leadsPerMonthReceived, leadsPerDayReceived, ratio targets)

**Comparaison avec §27 (Integrity) :**

| Aspect | 70155 Integrity | 70125 Telymonde |
|--------|-----------------|-----------------|
| Broker | ILC Storefront (3) / Realtime (19) | Telymonde (21) |
| Prix | 25 $ storefront | 20 $ |
| Post-success | LeadConduit flow | GHL REST + HTML email |
| Pré-match | Unmatched + reprocess | Idem + Integrity Realtime échoue d'abord |

**Note :** toujours **pas** de log « matched partner FFL » (Austin Roberts brID=307) — les « agents » FFL actifs ne reçoivent pas les leads récents en direct ; flux = vendors tiers.

---

## 35. Export migration — champs disponibles (Q7)

**Panel Leads** (`pageID=2`, Last 30 Days) :

| Option | Valeur |
|--------|--------|
| Format par défaut | **Excel** |
| Alternatives | HTML, PDF, Plain Text, Short Text Email |
| Preset champs | « All Standard Lead Fields » coché |
| Personnalisation | Lien **Change Fields To Send** (ajax) |

**Champs exportables (ajax Change Fields To Send) :**

*Standard / métadonnées :* Lead ID, Date, Lead Status, Lead Price Total, Lead Cost, Internal Notes, Partner Notes, Disposition, Times Sold, Lead Logs, Source Label, Sales Rep, Delivery Status, Refunds, Refund Reasons, Refund Descriptions

*Tracking / compliance :* IP Address, SRC, SRC ID, Landing Page, Optout, Unique Identifier, User Agent, TCPA Language, TCPA Consent, Trusted Form URL, LeadiD Token, Sub ID, Pub ID

*Contact / IUL :* First Name, Last Name, Address, City, State, Zip, Primary Phone, Email, DOB, Age, Primary Goal, Have IUL, Intent, State You Currently Live In

*Technique revente :* Ping Response Prices, Ping Responses, Post Responses, Match_With_Partner_ID, Test_Lead

→ Parité V1 migration : exporter via API/admin avec ces colonnes ; **ne pas** envoyer d'email prod (lecture seule respectée).

---

## 36. Portail agent Metronic (brID=307, session 7)

**URL impersonation :** `res_partners/$A3kz/brpage.php?brID=307&theme=metronic`

| Page | Contenu |
|------|---------|
| Dashboard | Stats IUL, balance **0 $**, status **Active** |
| Menu | Dashboard, My Leads, **Settings**, Reports, Add Funds, Contact Us, 2FA |
| Settings (`pageID=2`) | **Old Password / Password / Retype Password uniquement** |
| Lien | « Old UI » disponible |

**Conclusion Metronic :** même restriction que portail classique (§30) — **aucune UI filter sets** malgré permission admin cochée.

---

## 37. Duplicate Checking & ownership 24 h (P1 — clôturé partiel)

| Piste explorée | Résultat |
|----------------|----------|
| Lien **Duplicate Checking** (pageID=67) | Redirige vers **documentation Boberdoo.com** — pas de config tenant |
| Icône #1 Lead Type | Export CSV schema (§32) — pas config |
| Icône #2 Lead Type | Retention/cleanup (§29) — pas ownership |
| Source IUL_LeadConduit (§24) | `Delete Unmatched After Processing` = **Non** ; `Send Back Lead` = **Never** |
| Lead Log 70125 | Reprocess multiples à **0 $** ; cycles sur **heures** (pas label « 24 h » explicite) |

**Interprétation V1 :**

- La **fenêtre 24 h** unmatched → reprocess → Integrity est une **règle métier** (call client + PRD) ; Boberdoo l'implémente via **cron/reprocess** sans paramètre UI explicite trouvé sur cette instance.
- **Ownership** (lead revendu une seule fois / undoSale) : non configurable dans les écrans explorés ; géré par logique plateforme + admin `undoSaleAndReprocess`.
- **Duplicate checking** : feature plateforme Boberdoo (doc externe) — à reproduire en V1 via règles dedup phone/email/state côté intake.

---

## 38. Custom Delivery Ringy — id **291** (Partner 119 Ringy - IUL - directpost)

**URL edit readonly :** `old_admin/adminpage.php?pageID=83&gLeadTypeID=37&id=291` → Continue » (sans Save).

| Paramètre | Valeur |
|-----------|--------|
| Nom | Partner 119 Ringy - IUL - directpost |
| Partner associé | **brID=119** (nom wizard ; distinct de brID=307 Austin Roberts) |
| Mode | **DirectPost** (`isPingPost=0`) |
| Test mode | Non |
| Visible portail partner | Non (`showInBrokerSection=0`) |
| Gateway URL | `https://app.ringy.com/api/public/leads/new-lead` |
| Post Method | POST |
| JSON encode fields | **Oui** |
| Ignore SSL errors | Oui |
| Response Type | String |
| Success Response (regex) | `vendorResponseId` |
| HTTP Headers | *(vide — défaut)* |
| Notes (ticket) | cp.leadsystem.com ticket **195969** (même ticket que GHL §31) |

**Credentials hardcodés (delivery hardcoded values) :**

| Champ Ringy | Source Boberdoo | Note |
|-------------|-----------------|------|
| `sid` | Valeur fixe par partner | Correspond au champ profil **IUL Ringy SID** (§4) — **secret, non documenté ici** |
| `authToken` | Valeur fixe par partner | Correspond au champ profil **IUL Ringy Auth Token** (§4) — **secret, non documenté ici** |

**Mapping champs Boberdoo → Ringy API :**

| Champ Boberdoo | Champ Ringy | Format / note |
|----------------|-------------|---------------|
| First Name | `first_name` | |
| Last Name | `last_name` | |
| State | `state` | |
| Primary Phone | `phone_number` | `xxxxxxxxxx` |
| Email | `email` | |
| DOB | `birthday` | `m/d/Y` |
| Age | *(int)* | Convert to Int = Yes |
| Have IUL | `do_you_have_an_iul` | |
| Primary Goal | `goal` | |
| Date Created | *(timestamp)* | `Y-m-d H:i:s` |
| Intent, State You Currently Live In | *(Mapping links présents, valeurs vides sur id=291)* | À remplir par partner si besoin |
| Address, City, Zip, TCPA, Trusted Form, etc. | *(disponibles, non mappés sur cette delivery)* | |

**Champs système disponibles (non tous mappés) :** Lead ID, Filter Set ID/Name/Price, Matched Partner ID/Name/Company/Email/Phone, Source ID/Label, Cost, Refund/Decline Reason, etc. — même panoplie que GHL §31.

**Comparaison GHL vs Ringy (V1) :**

| Aspect | GHL id=297 | Ringy id=291 |
|--------|------------|--------------|
| Endpoint | `rest.gohighlevel.com/v1/contacts/` | `app.ringy.com/api/public/leads/new-lead` |
| Auth | Headers / champs API GHL | `sid` + `authToken` hardcodés |
| Succès | Regex `id"` (JSON contact) | Regex `vendorResponseId` |
| Champs custom IUL | `$our['data']` blob | Noms snake_case plats (`do_you_have_an_iul`, `goal`) |

**Parité V1 :** second modèle webhook CRM — POST JSON, credentials par agent, mapping champs IUL explicite.

---

## 39. Livraison directe partner FFL (session 8 + **corrigé session 9**)

**Recherches effectuées (session 8, lecture seule) :**

| Vue | Période | Résultat |
|-----|---------|----------|
| All Leads IUL | Last 30 Days | Table vide / « No records found » *(session courante ; §33 avait 25 leads en session 6)* |
| **Matched Leads** IUL | Last 90 Days | **No records found** |
| Filtre texte | Austin Roberts, Matthew Stewart, Freya Lewis | **Aucune occurrence** |

**Session 9 (30 juin 2026, live All Leads IUL, date = today) :**

| Lead ID | Destination | Prix | Statut livraison |
|---------|-------------|------|------------------|
| **70191** | **Twardowski (Family First Life)** | **25 $** | **Processed** |
| 70193 | Telymonde (Future Nest Life) | 20 $ | Lead successfully delivered |
| 70201, 70199, 70197… | Realtime (Integrity) | 22 $ | Lead successfully delivered |

→ **Match partner direct confirmé** pour au moins un agent FFL (Twardowski) sur flux du jour. Les filter sets actifs §25 (Austin Roberts, Matthew Stewart, Freya Lewis) n'apparaissent pas dans l'échantillon du jour — flux majoritaire reste **vendors** (Integrity, Telymonde).

**Conclusion mise à jour :**

- Le modèle de livraison agent (email/CRM après match) est **validé en prod** via lead 70191 — capturer **Show Lead Log** sur ce lead en session suivante pour parité GHL/email.
- L'échantillon session 8 (Matched 90 j = empty) ne généralise pas : utiliser **All Leads + date du jour** pour observer le mix partner/vendor.
- **Pas encore documenté :** Lead Log complet lead 70191 (Twardowski / FFL direct).

---

## 21. Blocages & prérequis session 4

- **Session admin expirée** — reconnecter avant Integrity Edit Filters et source detail
- **Lead Log** — URL directe inefficace ; utiliser action depuis liste Last 30 Days
- **Impersonation partner/vendor** — tokens URL courts ; récupérer href via CDP depuis admin
- **Iframes Old UI** — `/old_admin/adminpage.php?...&iframe=1` pour Custom Deliveries
- **Clics UI** — sidebar/overlays interceptent ; préférer URLs directes `pageID`
- **Export migration** — tester export Excel sans inclure PII dans le repo
- **API publique** — tables paramètres IUL non extractibles sans session browser (HTML minimal côté curl)

---

## 26. Plan de reprise agent (à lire en premier si contexte perdu)

> **Objectif global :** exploration **lecture seule** de Boberdoo Capital Leads pour alimenter `PROJECT.md` / `PRD.md` et la spec V1.  
> **Instance :** `https://capitalleads.leadportal.com`  
> **Doc vivante :** ce fichier — mettre à jour au fur et à mesure, horodater le journal §19.

### Consignes prod (NE JAMAIS)

- Save / Register / Activate / Deactivate filter
- Reprocess / Refund / Delete / Send export / Send Test Lead
- Télécharger exports contenant PII dans le repo

### Navigation fiable

| Besoin | URL / méthode |
|--------|----------------|
| Admin home | `new_admin/adminpage.php?pageID=0` |
| Leads IUL Last 30 Days | `pageID=2` → champ date → preset Last 30 Days |
| Partner brID=323 | `pageID=10&brID=323` |
| Filter sets partner | `pageID=10&brID=323&sub=showSettingsNew` |
| Filter list global IUL | `pageID=92` → lien sidebar IUL |
| Integrity vendor | `pageID=69&vID=3&type=vInfo` (vFilters, vAdvancedSettings) |
| Source/Vendor IUL | `pageID=8&Lead_Type=37` |
| Custom Deliveries IUL | `old_admin/adminpage.php?pageID=83&Lead_Type=37&iframe=1` |
| Lead Types | `pageID=67` |
| API specs (browser tab) | `new_api/index.php?action=req` |
| Impersonation partner | CDP href « Go To Partner Admin » depuis `pageID=10&brID=X` |
| Impersonation vendor Integrity | CDP href « Go To Vendor's Admin » depuis vID=3 |

**Astuce :** si clic intercepté → URL directe ou `browser_cdp` `Runtime.evaluate` pour extraire hrefs.

### Ce qui est RÉSOLU (ne pas re-explorer sauf vérif)

| Sujet | Réf doc |
|-------|---------|
| Champs lead IUL (~25) | §4 + `fixtures/boberdoo_iul_submit_lead.example.json` |
| API pingPostLead params | §5 + `fixtures/boberdoo_iul_ping_post.example.json` |
| Source IUL_LeadConduit detail | §24 |
| Lead Log exemple Integrity | §27 |
| GHL delivery pattern (id=297) | §31 |
| Ringy delivery pattern (id=291) | §38 |
| Absence match partner FFL direct | §39 |
| Distribution snapshot 30j | §33 |
| Lead Type CSV export (icône #1) | §32 |
| Export migration champs (Q7) | §35 |
| Metronic portail agent Settings | §36 |
| Duplicate Checking / ownership | §37 |
| Lead Log Telymonde + GHL | §34 |
| Integrity URLs ping/post | §28 |
| Partner Permissions Austin Roberts | §30 |
| Types leads + templates filter set | §3 |
| Intake API endpoints | §5 |
| TrustedForm v4.0 Post | §6 |
| Signup public champs | §7 |
| Statuts lead Integrity 22$/25$ | §8 |
| Integrity = vendor vID=3 (pas module) | §12 |
| Aged = manuel + type séparé | §9 |
| Portail agent menu + pageIDs | §13 |
| Custom Deliveries prod (search) | §23 |
| Lead Type cleanup/retention IUL | §29 |
| Q6 : permission filter sets ✓ mais UI agent = password | §30, §16 |
| Filter list actifs (3 partners) | §25 |
| Sources IUL actives (4) | §24 |

### Backlog exploration — **vide** (100 %)

Toutes les tâches optionnelles des sessions 6–8 sont résolues ou classées « non applicable en prod » :

| Tâche | Statut |
|-------|--------|
| Lead Log match partner FFL direct | **N/A** — aucun lead matched partner FFL sur 90 j (§39) |
| Edit delivery Ringy id=291 | **✓** §38 |
| Fixture CSV schema icône #1 | Colonnes connues §32 — export complet non commité (PII/schema) |

### IDs & exemples utiles

| Entité | ID / valeur |
|--------|-------------|
| Lead type IUL | 37 |
| Vendor Integrity | vID=3 |
| Integrity brokers | Storefront brokerID=3, Realtime brokerID=19 |
| Telymonde broker | brokerID=**21**, masterSettingID **211**, delivery log **213** (GHL §31) |
| Ringy delivery (wizard) | id=**291** (Partner 119) — §38 |
| GHL delivery (wizard) | id=**297** (21s GHL) — §31 |
| Integrity deliveries (wizard/log) | 273/219 Storefront, 281/223 Realtime |
| Integrity post URLs | LeadConduit flows (§28) |
| Lead Type cleanup IUL | §29 (ajax icône #2 pageID=67) |
| Partner Permissions | §30 |
| Integrity ping URL (realtime) | ilc-functions-prod.azurewebsites.net/api/IsAcceptingCampaign |
| Partner Active test | brID=**307** (Austin Roberts, FFL, Active) |
| Partner Permissions URL | `pageID=10&brID=307&sub=permissions` |
| Partners filter actifs | Austin Roberts, Matthew Stewart, Freya Lewis |
| Lead IDs prod récents | 70155, 70153, 70151… |
| Prix agent | 25–27 $, priorité 5 |
| Prix Integrity | Realtime 22 $, Storefront 25 $ |

### Terminologie rapide

- **Partner** = agent | **Company** = affiliation | **Vendor (seller)** = Integrity acheteur revente | **Source** = LeadConduit/Meta intake

### Après chaque session

1. Horodater entrées §19  
2. Cocher tâches §26  
3. Mettre à jour §16 (questions ouvertes)  
4. Noter blocages §21  

---

## 22. Références

- `docs/PROJECT.md` — mémoire projet
- `docs/PRD.md` — spec implémentation
- `docs/capital_solu_initial_call_transcript.txt` — call client
- API : https://capitalleads.leadportal.com/new_api/index.php
- Signup : https://capitalleads.leadportal.com/signup
