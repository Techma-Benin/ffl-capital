# Boberdoo vs FFL Capital build — gap analysis

> **Purpose:** inventory everything visible in the Capital Leads Boberdoo instance, compare it to what is built, and list remaining gaps.  
> **Date:** 13 July 2026 (updated from 30 June 2026 baseline)  
> **Sources:** `docs/BOBERDOO_EXPLORATION.md`, codebase audit (`src/`, `prisma/`, `design/`).

---

## Executive summary (July 2026)

Since the June gap analysis, **most V1 backend and essential UI have been implemented**. The product is testable end-to-end with simulated or LeadConduit intake.

| Layer | Boberdoo (Capital Leads) | Our build (Jul 2026) | Gap |
|-------|--------------------------|----------------------|-----|
| **Admin UI** | ~20 top-level modules, dense dashboards | Dashboard, leads (tabs/filters/search/detail/events), partners (approve/detail/filter sets), refunds, settings, migration, filter list, integrity | **~40 % UI missing** (charts, billing, multi lead-type nav) |
| **Partner UI** | 7 menu items + Add Funds + Reports | Dashboard, leads (+ refund request), wallet (Stripe), aged marketplace, settings, contact | **~25 % missing** (reports/transactions page, 2FA) |
| **Backend logic** | Full lifecycle | Intake → match → deliver → reprocess → Integrity mock → refund → aged | **~15 % missing** (Integrity **live**, prod cron scheduler) |
| **DB schema** | N/A | 11 tables incl. `lead_events`, `partner_filter_sets` | **~90 % present** |
| **Pencil mockup** | 9 screens planned | 9 screens designed | Mockup still ahead on some Boberdoo-only admin screens |

**Bottom line:** V1 core is **built and wired**. Remaining work is Boberdoo parity polish, Integrity live credentials, production cutover (LeadConduit URL, Stripe prod, cron scheduler), and advanced admin config screens.

---

## 1. Complete Boberdoo inventory (what must be accounted for)

### 1.1 Admin — top navigation

Everything below appears in the Boberdoo admin sidebar (confirmed Home snapshot 30 Jun 2026 + exploration doc).

| # | Boberdoo section | pageID / URL | In V1 scope? | Built? | Notes |
|---|------------------|--------------|:------------:|:------:|-------|
| 1 | **Home / Dashboard** | 0 | ✓ (simplified) | partial | Charts, widgets, date range, lead-type filter, activity feed |
| 2 | **Settings** (submenu) | varies | partial | ✗ | Lead Types, Source/Vendor, Manage Vendors, Custom Deliveries |
| 2a | Lead Types | 67 | ✓ config | ✗ | IUL, Aged IUL, retention/cleanup |
| 2b | Source/Vendor Settings | 8 | ✓ | ✗ | IUL_LeadConduit, matching algorithms per source |
| 2c | Manage Vendors | 69 | ✓ (Integrity) | ✗ | Integrity Lead Center, Facebook 2nd chance, etc. |
| 2d | Custom Deliveries Wizard | 83 | ✓ (CRM + Integrity) | ✗ | GHL, Ringy, Integrity ping/post URLs |
| 3 | **Outside Services** | 272 | ✓ (TrustedForm) | ✗ | TrustedForm v4.0 Post validation |
| 4 | Forms Builder | 333 | ✗ hors scope | ✗ | |
| 5 | Phone Routing | — | ✗ hors scope | ✗ | |
| 6 | **Leads** | 2 | ✓ | **strong partial** | Tabs, filters, search, detail + event log, reprocess |
| 7 | **Lead Search/Delete** | 77 | ✓ | **partial** | Search on leads list ✅; delete API ✅; no dedicated page |
| 8 | **Aged Leads** | 119 | ✓ (innovation) | **partial** | Partner marketplace ✅; admin browse ✅ |
| 9 | **Partners** | 3 | ✓ | **strong partial** | List, approve, detail, edit, filter sets view |
| 10 | **Filter List** | 92 | ✓ | **✅** | `/admin/filter-list` |
| 11 | Filter Changes | — | nice-to-have | ✗ | Audit log of filter set edits |
| 12 | **Refunds** | 15, 256 | ✓ | **✅** | Pending queue + history + partner requests |
| 13 | Reports | — | partial | ✗ | Partner/lead/vendor reports |
| 14 | **Billing & Payments** | 218 | ✓ | ✗ | Invoices, payment methods |
| 15 | Compliance | — | ✗ hors scope | ✗ | |
| 16 | Directory | — | ✗ | ✗ | |
| 17 | Tools/Logs | — | partial | ✗ | Email errors, account changes, etc. |

### 1.2 Admin — Home dashboard (pageID=0)

| Widget / control | Boberdoo | Built? |
|------------------|----------|:------:|
| Lead type selector (IUL, IUL2, MP, Life, Veteran, FE, Inbound Phone) | ✓ | ✗ |
| Date range picker (Today, Yesterday, Last 7/30 Days, Custom) | ✓ | **partial** (Today, Yesterday, Last 7, Custom — no Last 30) |
| Chart: Lead Sales By Source | ✓ | ✗ |
| Chart: Leads Overview By Source | ✓ | ✗ |
| Chart: Leads Overview By Vendors | ✓ | ✗ |
| Chart: Partner Statistics | ✓ | ✗ |
| Widget: Lead Rejects | ✓ | ✗ |
| Widget: Similarity Errors | ✓ | ✗ |
| Widget: Blocked Users | ✓ | ✗ |
| Widget: Support Tickets | ✓ | ✗ |
| Activity counters: Account Changes, Email Errors, Filterset Changes, Partner Payments | ✓ | ✗ |
| Summary stat cards (leads, partners, unmatched, pending) | partial | **partial** (4 cards only) |

**V1 recommendation:** keep a **modern simplified dashboard** (stat cards + 1–2 charts + unmatched queue link), not full Boberdoo parity on every widget.

### 1.3 Admin — Leads (pageID=2)

**Sidebar structure (live, session 9):** under **Leads**, each lead type is its own subtree. For **IUL**: All Leads | Review | Matched | Unmatched | Declined. Sibling types: IUL2, Mortgage Protection, Life Insurance, Veteran, Final Expense, Inbound Phone.

| Feature | Boberdoo | Built? |
|---------|----------|:------:|
| Sub-views per lead type (All, Review, Matched, Unmatched, Declined) | ✓ | ✗ (single list) |
| Lead type in sidebar (7 types) | ✓ | ✗ |
| Date range filter (with time: `00:00:00 - 23:59:59`) | ✓ | ✗ |
| **Lead ID** quick search field | ✓ | ✗ |
| **Select Template** dropdown + **Load** | ✓ | ✗ |
| **Filter Leads** button (advanced filters) | ✓ | ✗ |
| **Show reprocess window** button | ✓ | ✗ |
| Table columns: ID, date, name, state, status, partner/vendor, price | ✓ | partial (6 cols, no price/ID/log) |
| **Show Lead Log** (full delivery timeline) | ✓ | ✗ |
| Get Unmatched Reasons | ✓ | ✗ |
| View matching filter set | ✓ | ✗ |
| **Outside Services result** link per row (TrustedForm status) | ✓ | ✗ |
| Redeliver to destination (dynamic: Realtime, Telymonde, partner name…) | ✓ | ✗ |
| Refund Lead (admin-initiated) | ✓ | ✗ |
| Edit Lead | ✓ | ✗ |
| DNC Check | ✓ | ✗ (optional V1) |
| Row status badges: vendor/partner name + price (e.g. `Realtime (Integrity) - $22.00/ New`) | ✓ | ✗ |
| Delivery status: **Lead successfully delivered** vs **Processed** | ✓ | ✗ |
| Refund status badge: **No Refund Request** | ✓ | ✗ |
| Export panel: **Send Filtered Leads To** (email + format + fields) | ✓ | ✗ |
| Export: Excel (default), HTML, PDF, Plain Text, Short Text | ✓ | ✗ |
| Change Fields To Send (export field picker) | ✓ | ✗ |
| Use Password (export option) | ✓ | ✗ |
| Help links: Testing Lead Submissions, How To Read A Lead Log | ✓ | ✗ |
| Refresh Page | ✓ | ✗ |

**Live destinations observed today (IUL, 30 Jun 2026):**

| Destination | Price | Example lead ID |
|-------------|-------|-----------------|
| Realtime (Integrity) | $22.00 | 70201, 70199, 70197… |
| Telymonde (Future Nest Life) | $20.00 | 70193 |
| **Twardowski (Family First Life)** | **$25.00** | **70191** ← direct partner match |
| Storefront (Integrity) | $25.00 | (prior sessions) |

**Backend today:** `POST /api/leads/intake`, list in admin UI — no detail API, no status sub-filters, no reprocess/resale jobs.

### 1.4 Admin — Partners (pageID=3, detail pageID=10)

| Feature | Boberdoo | Built? |
|---------|----------|:------:|
| List columns: ID, Company, Name, State, Lead Buying, Credit Limit, Account Status, Labels, Created | ✓ | partial (6 cols) |
| Add Partner wizard | ✓ | ✗ (signup + approval instead) |
| Partner detail — Contact Information | ✓ | ✗ |
| Partner detail — Consent Settings | ✓ | ✗ |
| Partner detail — Account Information | ✓ | ✗ |
| Partner detail — Lead Type Settings | ✓ | ✗ |
| Partner detail — **Filter Sets** (multiple per partner) | ✓ | ✗ (single profile on Partner row) |
| Filter set: price override, priority, states, delivery, hourly/daily limits | ✓ | partial (price/priority/states on Partner only) |
| Filter set templates (Standard IUL, High Intent IUL) | ✓ | ✗ |
| Default Delivery (HTML email, CRM webhook) | ✓ | partial (`crmWebhookUrl` column only) |
| Lead Limits Settings | ✓ | ✗ |
| Sub-pages: Transactions, Request Refund, Bulk Refund, Invoicing | ✓ | ✗ |
| Partner Permissions (granular toggles) | ✓ | ✗ |
| **Go To Partner Admin** (impersonation) | ✓ | ✗ |
| Approve / activate account | ✓ | partial (API exists, no UI button) |
| Credit Limit field | ✓ | ✗ (unused in prod anyway) |

**Schema gap:** Boberdoo supports **multiple filter sets per partner**; we flatten to one `filterStates` + `priceOverride` on `Partner`. Consider `FilterSet` model or document as V1 simplification.

### 1.5 Admin — Refunds (pageID=15, 256)

| Feature | Boberdoo | Built? |
|---------|----------|:------:|
| Approve Refunds (aggregated by partner) | ✓ | ✗ |
| Approve Refunds (per-lead, new UI) | ✓ | ✗ |
| Browse Refunds history | ✓ | ✗ |
| Refund reasons (wrong filter, invalid phone, etc.) | ✓ | partial (enum in schema) |
| Partner-initiated Request Refund | ✓ | ✗ |
| Bulk Request Refund | ✓ | ✗ |
| Credit wallet on approve | ✓ | ✗ (ledger supports `refund` type) |
| undoSaleAndReprocess (re-list lead) | ✓ | ✗ |

**Schema today:** `refund_requests` table exists; UI is placeholder only.

### 1.6 Admin — Aged Leads (pageID=119)

| Feature | Boberdoo today | Our V1 target | Built? |
|---------|----------------|---------------|:------:|
| Aged Leads Browse | ✓ manual list | ✓ | ✗ |
| Aged IUL type | ✓ | ✓ | ✗ |
| Aged Leads Upload | ✓ admin manual | optional admin import | ✗ |
| **Partner marketplace self-service** | ✗ absent | ✓ **innovation** | stub page |

### 1.7 Admin — Configuration (Settings subtree)

| Screen | Key content | Built? |
|--------|-------------|:------:|
| Lead Types (67) | IUL default price, retention, reprocess rules | ✗ (`app_settings` only) |
| Source/Vendor (8) | IUL_LeadConduit, HighIntent source, matching algorithm | ✗ |
| Manage Vendors (69) | Integrity Lead Center config | ✗ |
| Custom Deliveries (83) | GHL, Ringy, Integrity URLs | ✗ |
| Outside Services (272) | TrustedForm validation rules | ✗ |

### 1.8 Admin — Billing & Reports

| Feature | Boberdoo | Built? |
|---------|----------|:------:|
| Partner invoices | ✓ | ✗ |
| Payment methods | ✓ | ✗ |
| Partner Transactions list | ✓ | ✗ (schema `transactions` exists) |
| Reports (lead sales, partner stats) | ✓ | ✗ |

### 1.9 Public signup (`/signup`)

| Field | Boberdoo | Our onboarding | Built? |
|-------|----------|----------------|:------:|
| First / Last Name | ✓ | ✓ | ✓ |
| Company (affiliation) | ✓ | ✓ | ✓ |
| Phone | ✓ | ✗ | ✗ |
| Address, City, State, ZIP, Country | ✓ | partial (residence state only) | ✗ |
| Website, Promotion Code | optional | ✗ | ✗ |
| Lead types (multi) | ✓ | single select | partial |
| States (multi, ~15) | ✓ | ✓ min 15 | ✓ |
| Billing: One-Time / Weekly | ✓ | ✗ | ✗ |
| Email / Login | ✓ | Clerk sign-up separate | partial |
| Days/times accept leads | info field | ✗ | ✗ |
| Stripe card at signup | not visible | N/A | ✗ (Add Funds later) |

### 1.10 Partner portal

| Menu item | Boberdoo | Built? | Notes |
|-----------|----------|:------:|-------|
| Dashboard | ✓ stats, balance, lead type filter | partial | 3 stat cards only |
| My Leads | ✓ delivered leads list | partial | table, no detail/refund |
| Settings | password only in Boberdoo | ✗ | **V1 improvement:** edit states + CRM |
| Reports | ✓ transactions | ✗ | |
| Add Funds | ✓ Stripe | stub | "Phase 3" placeholder |
| Contact Us | ✓ | ✗ | |
| 2FA Settings | ✓ | ✗ | optional (Clerk may cover) |
| **Aged Leads / Marketplace** | ✗ in Boberdoo | stub | **our innovation** |
| Request Refund | ✓ | ✗ | |
| Bulk Request Refund | ✓ | ✗ | |
| Filter sets self-service | ✗ in Boberdoo | planned | PRD decision: allow state edits |

### 1.11 Lead data & delivery (cross-cutting)

| Capability | Boberdoo | Built? |
|------------|----------|:------:|
| ~25 IUL fields in payload | ✓ | partial (`raw_payload` + core columns) |
| TrustedForm cert storage | ✓ | ✓ column |
| HTML email delivery on match | ✓ | ✗ |
| CRM webhook (GHL JSON) | ✓ | ✗ (`crmWebhookUrl` unused) |
| Ringy delivery (sid + authToken) | ✓ | ✗ |
| Integrity ping/post fallback | ✓ | ✗ (`resale_postings` schema only) |
| 24h unmatched reprocess cron | ✓ (implicit) | ✗ |
| Weighted delivery (Storefront vs Realtime) | ✓ | ✗ |
| Duplicate checking | ✓ (platform) | ✗ |
| Lead ownership / single-sale rules | ✓ | partial (`available` flag) |

---

## 2. What we have built (current codebase — July 2026)

### 2.1 Backend — implemented

| Component | Location | Status |
|-----------|----------|--------|
| Prisma schema (11 tables) | `prisma/schema.prisma` | ✅ |
| Intake validation + normalize + process | `src/lib/intake/*` | ✅ |
| Duplicate detection + TrustedForm validation | `src/lib/intake/*` | ✅ |
| Intake API (CORS, public) | `POST /api/leads/intake` | ✅ |
| Matching engine v2 (filter sets, limits) | `src/lib/matching/*` | ✅ |
| Delivery (Resend, CRM webhook, Ringy) | `src/lib/delivery/*` | ✅ |
| Refunds Type A/B | `src/lib/refunds/*` | ✅ |
| Aged purchase | `src/lib/aged/*` | ✅ |
| Integrity ping/post | `src/lib/integrity/*` | ✅ mock |
| Cron jobs | `/api/cron/*` | ✅ routes |
| Stripe wallet + webhook | `/api/wallet/*`, `/api/webhooks/stripe` | ✅ |
| Lead events audit | `lead_events` + `emitLeadEvent` | ✅ |
| Partner filter sets CRUD | `/api/admin/partners/[id]/filter-sets` | ✅ |
| Admin leads APIs | search, export, reprocess, redeliver, refund | ✅ |
| Dev tools | `/dev/lead-simulator`, `/feeding-platform` | ✅ |

### 2.2 Backend — blocked or partial

- IntegrityCONNECT **live** — mock only; needs client API credentials
- Production **cron scheduler** — routes exist; needs Vercel Cron / pg_cron config
- Stripe **prod** keys — test mode complete

### 2.3 Frontend — implemented

| Route | Content |
|-------|---------|
| `/admin` | Operations dashboard (period filter `?period=&from=&to=`, KPIs, intake/delivery charts, recent leads) |
| `/admin/leads` | Tabs, filters, search, reprocess actions |
| `/admin/leads/[id]` | Full detail, event log, delivery timeline, raw payload |
| `/admin/partners` | List, status tabs, approval actions |
| `/admin/partners/[id]` | Edit form, filter sets, deliveries, transactions |
| `/admin/refunds` | Pending queue + approve/reject + history |
| `/admin/filter-list` | Global filter set matching overview |
| `/admin/settings` | App settings form |
| `/admin/migration` | Boberdoo CSV import |
| `/admin/integrity` | Resale postings view |
| `/admin/aged` | Aged leads admin browse |
| `/partner` | Dashboard |
| `/partner/leads` | Deliveries + refund request |
| `/partner/wallet` | Stripe top-up + weekly subscribe + transactions |
| `/partner/aged` | Marketplace browse/purchase |
| `/partner/settings` | States + CRM URL editor |
| `/partner/contact` | Contact form |
| `/onboarding` | Partner signup flow |
| `/sign-in`, `/sign-up` | Clerk |

### 2.4 Frontend — still missing (V1 polish / P2)

- Admin dashboard charts beyond intake + delivery channel (sales by source, vendor widgets)
- Dedicated lead search/delete page (search is on leads list; delete API only)
- Admin lead row actions: redeliver, admin-initiated refund (APIs exist, no UI buttons)
- Partner Reports / transaction history page (data in wallet page only)
- Boberdoo-style Settings subtree (lead types, source/vendor, custom deliveries wizard)
- Billing & invoices PDF
- Filter set CRUD UI on partner detail (view only today)

### 2.4 Pencil mockup (`design/ffl-capital-ui-mockup.pen`)

Screens designed (ahead of code):

1. Partner Dashboard  
2. Partner Aged marketplace (**new vs Boberdoo**)  
3. Partner Wallet  
4. Partner My leads  
5. Partner Onboarding  
6. Admin Operations dashboard  
7. Admin Partners (approval queue)  
8. Admin Refunds (Type A / B)  
9. Screen inventory map  

**Mockup gaps vs this inventory:** Admin Lead detail/log, Admin Leads sub-views, Filter List, Source/Vendor config, Integrity resale admin, Lead Search, Billing/Reports, Partner Reports, Partner Request Refund, Partner Settings (state editor).

---

## 3. Client additions beyond Boberdoo (must not forget)

These are **intentional** — not gaps, but must appear in mockup + build:

| Feature | Source | Built? |
|---------|--------|:------:|
| Aged leads marketplace (self-service, $5 unit) | PRD §5, call client | **✅** |
| Partner can edit target states post-onboarding | Review #1, PRD Q6 | **✅** settings page |
| Modern Integrity-branded UI | PRD §11, proposal | partial |
| Unified refund workflow in-app | PRD innovation | **✅** |
| Post-refund routing (Type A / B) | PRD §5.8 | **✅** |
| Single domain for all partners | PRD constraint | ✓ |

---

## 4. Priority backlog (July 2026 — revised)

### P0 — Production readiness

1. **LeadConduit cutover** — point prod flow to `/api/leads/intake` ([LEADCONDUIT_SETUP.md](LEADCONDUIT_SETUP.md))
2. **Cron scheduler** in prod (reprocess + integrity-post)
3. **IntegrityCONNECT live** — when client provides API specs
4. **Stripe prod** keys + webhook

### P1 — Admin UX polish (APIs exist)

5. Lead detail actions: **redeliver**, **admin refund** buttons
6. Admin dashboard charts (simplified vs Boberdoo)
7. Partner **Reports** page (transaction export)
8. Filter set **edit UI** on partner detail

### P2 — Boberdoo parity (optional V1)

9. Lead type sub-nav (IUL2, MP, Veteran, etc.)
10. Settings subtree (sources, vendors, custom deliveries wizard)
11. Billing/invoices
12. Export panel on leads (Excel field picker)

### P3 — Explicitly out of V1 (document only)

- Forms Builder, Phone Routing, Compliance module, Inbound Phone  
- Multi lead type UI (MP, Veteran, etc.) — DB ready, UI later  
- Full Boberdoo dashboard widget parity (Similarity Errors, Blocked Users, Tickets)  
- Partner impersonation, Bulk CRM Upload, Cherry Picker  
- DNC Check, Filter Changes audit  

---

## 5. Schema / model gaps to decide

| Topic | Boberdoo | Our model | Action |
|-------|----------|-----------|--------|
| Multiple filter sets per partner | Yes (2+ templates) | `partner_filter_sets` table | **✅ done** |
| Filter set templates | Standard / High Intent COPY | Per filter set row | OK for V1 |
| Lead log / events | Rich timeline | `lead_events` table | **✅ done** |

---

## 6. Mockup update checklist

When updating `design/ffl-capital-ui-mockup.pen`, add or refine:

- [ ] Admin — Leads list with tabs (All / Matched / Unmatched / Declined) + date range  
- [ ] Admin — Lead detail / timeline (Show Lead Log equivalent)  
- [ ] Admin — Partner detail (filter set card, approve, edit priority/price/states)  
- [ ] Admin — Filter List (global matching overview)  
- [ ] Admin — Config shortcut panel (default IUL price, Integrity toggle) — simplified Settings  
- [ ] Admin — Lead Search  
- [ ] Partner — Request Refund flow (from My Leads row)  
- [ ] Partner — Settings (state editor — **new vs Boberdoo**)  
- [ ] Partner — Reports / transaction list  
- [ ] Partner — Contact Us (simple form or mailto)  
- [ ] Refine Admin Dashboard charts (not 100 % Boberdoo — modern subset)  

---

## 7. Link to exploration doc

`docs/BOBERDOO_EXPLORATION.md` remains the **source of truth for Boberdoo behavior** (field lists, Integrity URLs, lead log examples, API endpoints, partner permissions). This gap doc does **not** duplicate that detail — it maps it to **build status**.

**Exploration doc status:** session 9 live verification complete for main admin + partner portal. Optional: `/signup`, Lead Search, Outside Services, Lead Log 70191.

---

## 10. Session 9 — live details (30 Jun 2026)

### Admin — Partners (pageID=3)

**Submenu under Partners:** Manage Partners Account | Add Partner | Add Sub-Partner | Bulk CRM Upload | Default Partner Permissions

**List toolbar:** Company/Last Name search | status filter (Not Active / Temporarily Stopped / Active) | **Filter Partners** | advanced filters (String, Status, Status Reason, State, Primary Label, Secondary Label, Partner's Group, Sales Rep)

**Columns:** ID, Company Name, Name, State, Lead Buying, Credit Limit, Account Status, Primary Partner Label, Secondary Label, Created

**Per-row actions:** Lead Filter Sets | Invoicing/Billing

**Partner detail submenu (brID=323):** Manage Sub-Partners | Transactions | Request Refund | Bulk Request Refund | Lead Filter Sets (Table View + normal) | Account Settings | Account Settings History | Advanced Settings | Invoicing/Billing | Partner Permissions | Partner Responses Logs | **Go To Partner Admin**

**Account Settings tabs:** Contact Information | Consent Settings | Account Information | Lead Type Settings | Default Delivery | Lead Limits Settings

**Contact fields observed:** Company, name, email/login, phone, address, Ringy SID/token (IUL + IUL2), IP allowlist, Force Password Change, Send Password Reset Email

### Admin — Filter Sets (pageID=10, brID=323)

**Toolbar:** Add New Filter Set | Select Template + Add From Template (High Intent IUL, **Second Chance IUL**, Standard IUL, MP, Veteran) | Remove Template | Hide Inactive | Search By Name/ID | Switch To Avatar View

**Columns:** Filter Set ID, Date Created/Modified, Filter Set Name, Lead Type, Price, Match Priority, **Exclusivity**, limits (hourly/daily/weekly/monthly)

**Row actions:** Edit | Activate/Deactivate toggle | Remove | context menu (Filter Set Details, Statistic, Copy, Delivery Options History)

### Admin — Filter List (pageID=92)

**Submenu per lead type:** IUL, IUL2, MP, Life, Veteran, FE, Inbound Phone

**Columns:** ID, Partner Name, Partner Label, Partner Status, Company, Filter Set Name, **Delivery Name and Emails**, Filter Status, Group, Matching Priority, Daily Limit/Target, Monthly Limit/Target, Lead Price, Balance

**Toolbar:** Search | Filter ID | **Excel export**

**Active filters today:** Austin Roberts, Matthew Stewart, Freya Lewis (Standard IUL COPY)

### Admin — Refunds (pageID=15)

**Submenu:** Approve Refunds (OLD) | Approve Refunds (new) | Browse Refunds

**OLD view columns:** ID, Company, Name, Address, City, State, **Reclamation #**, Credit, Credit Limit, Status, Created

### Admin — Aged Leads (pageID=119)

**Submenu:** Aged Leads Browse | Aged IUL | Aged Leads Upload

**Toolbar:** Show Last Processing Log | date range (incl. **All**) | template combobox + Load | Refresh Page

### Admin — Settings (full submenu, pageID=1+)

User Settings | 2FA | Email | Twilio | **Source/Vendor Settings** | **Manage Vendors** | Source Labels | **Lead Types** | Lead Types Examples | Manage Partners Groups/Labels | Manage Admin Users/Groups | Blocked Accounts | **Add Funds Settings** | **Custom Deliveries Wizard** | Sales Reps | **API Keys** | **API Specs** | Webhooks | Manual Entry Form

### Admin — Billing (pageID=218)

**Submenu:** Invoices | Payment Method | Contact Information

**Per invoice row:** Download Invoice | View Invoice | Billing Statistics

### Admin — Reports (pageID=19)

**Submenu:** Generic Reports | Aged IUL / IUL / … (per type) | Custom Reports | Timed Reports | Reports Execution History | Archived Reports

**Sample report names (40+):** Lead Sales By Source/State/Filter Set, Leads Overview By Vendors, Partner Statistics, Partner List, Leads Received/Returned By Partner, Lead Rejects, Partner Change History…

### Partner portal (impersonation brID=323)

**Menu:** Dashboard | My Leads | Settings | Reports | **Add Funds** | Contact Us | 2FA Settings | Back to ADMIN

**Dashboard header:** Status (Not Active) | Account Balance ($0.00) | Partner ID | lead type filter | date range

**Add Funds (pageID=39):** Stripe | Card / Bank Account tabs | payment profile dropdown | amount | **Submit Payment**

## 8. Browser session note

| Session | Date | Result |
|---------|------|--------|
| **9 (complete)** | 30 Jun 2026 | Live walkthrough via **sidebar clicks** — Partners, Filter List, Refunds, Aged Leads, Settings (full submenu), Billing, Reports (40+ report types), Partner portal impersonation (brID=323). All Leads verified earlier same day. |
| 8 | 26 Jun 2026 | Exploration doc marked 100 % |

**Workflow for future sessions:** ask user yes/no « logged in? » before continuing.

**Not yet verified live:** public `/signup`, Lead Search/Delete, Outside Services, Show Lead Log on lead 70191 (Twardowski FFL match), Approve Refunds (new UI pageID=256).

---

## 9. Quick reference — navigation map

```
BOBERDOO ADMIN                          OUR APP (Jul 2026)
─────────────────────────────────────────────────────────
Home (charts, widgets)                  /admin (stats + recent leads)
Settings → Lead Types, Sources,         /admin/settings (partial)
  Vendors, Custom Deliveries
Leads (5 sub-views, actions)            /admin/leads (tabs, filters, search, detail)
Lead Search/Delete                      search on leads list; delete API only
Aged Leads                              /admin/aged + /partner/aged marketplace
Partners + detail + filter sets         /admin/partners + /admin/filter-list
Refunds                                 /admin/refunds (full workflow)
Billing & Reports                       (not built)
─────────────────────────────────────────────────────────
PARTNER PORTAL
Dashboard                               /partner
My Leads + Request Refund               /partner/leads
Add Funds / Wallet                      /partner/wallet (Stripe)
Aged Marketplace                        /partner/aged ← innovation
Settings / Contact                      /partner/settings, /partner/contact
Reports                                 (wallet tx only — no reports page)
Public /signup                          /sign-up + /onboarding
```

---

*Maintained by TECHMA — update this file when screens or APIs land.*
