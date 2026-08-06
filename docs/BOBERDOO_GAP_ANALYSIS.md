# Boberdoo vs FFL Capital build — gap analysis

> **Purpose:** inventory everything visible in the Capital Leads Boberdoo instance, compare it to what is already built (backend + UI mockup + Next.js shells), and list what is missing so we can update the mockup and implementation plan.  
> **Date:** 30 June 2026  
> **Sources:** `docs/BOBERDOO_EXPLORATION.md` (prior browser sessions, ~100 % coverage), live browser snapshot (Home dashboard, session expired on navigation), codebase audit (`src/`, `prisma/`, `design/`).  
> **Live re-verification:** session 9 (30 Jun 2026) — **All Leads (pageID=2)** captured live; session expired on direct URL navigate to Partners. Re-login required to continue Partners → Refunds → Partner portal.

---

## Executive summary

The dissatisfaction with the current backend + mockup is expected: **we have foundations (schema, intake, basic matching, minimal shells) but almost none of the surface area Boberdoo exposes**. The exploration doc is largely complete for *understanding* Boberdoo; what was missing was a **structured build checklist** tied to each screen and action.

| Layer | Boberdoo (Capital Leads) | Our build today | Gap |
|-------|--------------------------|-----------------|-----|
| **Admin UI** | ~20 top-level modules, dense dashboards, per-lead actions | 4 nav links, 4 stat cards, 2 tables, 1 stub | **~90 % UI missing** |
| **Partner UI** | 7 menu items + Add Funds + Reports | 4 nav links, basic tables, 2 stubs | **~75 % UI missing** |
| **Backend logic** | Full lifecycle (match → deliver → reprocess → resale → refund) | Intake + match + wallet debit only | **~60 % logic missing** |
| **DB schema** | N/A (Boberdoo internal) | 9 tables, aligned with PRD | **~85 % schema present** |
| **Pencil mockup** | 9 screens planned | 9 screens designed | **Mockup ahead of code; still missing several Boberdoo-only admin screens** |

**Bottom line:** the schema and intake path are on track; the **visible product** (dashboards, workflows, config screens) has not been built yet. This document is the checklist to close that gap.

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
| 6 | **Leads** | 2 | ✓ | partial | All / Review / Matched / Unmatched / Declined |
| 7 | **Lead Search/Delete** | 77 | ✓ | ✗ | Search by ID, phone, email; delete |
| 8 | **Aged Leads** | 119 | ✓ (innovation) | stub | Browse + Upload today; marketplace target |
| 9 | **Partners** | 3 | ✓ | partial | List only; no detail / filter sets |
| 10 | **Filter List** | 92 | ✓ | ✗ | Global view: partner, filter set, price, balance, status |
| 11 | Filter Changes | — | nice-to-have | ✗ | Audit log of filter set edits |
| 12 | **Refunds** | 15, 256 | ✓ | stub | Approve + Browse; partner Request Refund |
| 13 | Reports | — | partial | ✗ | Partner/lead/vendor reports |
| 14 | **Billing & Payments** | 218 | ✓ | ✗ | Invoices, payment methods |
| 15 | Compliance | — | ✗ hors scope | ✗ | |
| 16 | Directory | — | ✗ | ✗ | |
| 17 | Tools/Logs | — | partial | ✗ | Email errors, account changes, etc. |

### 1.2 Admin — Home dashboard (pageID=0)

| Widget / control | Boberdoo | Built? |
|------------------|----------|:------:|
| Lead type selector (IUL, IUL2, MP, Life, Veteran, FE, Inbound Phone) | ✓ | ✗ |
| Date range picker (Today, Yesterday, Last 7/30 Days, Custom) | ✓ | ✗ |
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
| Contact Us | ✓ | ✓ | Form → `POST /api/partner/contact` (Resend) ; not mailto |
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

## 2. What we have built (current codebase)

### 2.1 Backend — implemented

| Component | Location | Status |
|-----------|----------|--------|
| Prisma schema (9 tables) | `prisma/schema.prisma` | ✅ |
| Intake validation (Zod) | `src/lib/intake/validate-intake.ts` | ✅ |
| Boberdoo field normalization | `src/lib/intake/normalize-lead.ts` | ✅ |
| Intake API | `POST /api/leads/intake` | ✅ |
| Matching engine (priority + FIFO) | `src/lib/matching/engine.ts` | ✅ |
| Eligibility rules (15 states, balance, type) | `src/lib/matching/eligibility.ts` | ✅ |
| Wallet ledger (append-only) | `src/lib/wallet/ledger.ts` | ✅ |
| Partner onboarding API | `POST /api/partners/onboarding` | ✅ |
| Partner approval API | `POST /api/admin/partners/approve` | ✅ (no UI) |
| Health check | `GET /api/health` | ✅ |
| Dev lead simulator | `/dev/lead-simulator` | ✅ |
| App settings helper | `src/lib/settings/app-settings.ts` | ✅ |

### 2.2 Backend — schema only (no logic/UI)

- `refund_requests` — no workflow
- `billing_recurrence` — no Stripe subscription
- `resale_postings` — no Integrity ping/post
- `migration_jobs` — no import UI
- Email delivery, CRM webhooks, TrustedForm validation service
- Cron: reprocess unmatched, age leads at 30 days
- Transaction history API for partner Reports

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
| `/partner/settings` | Profile + Lead delivery cards, filter sets |
| `/partner/settings/crm-outbound` | CRM outbound wizard (POST config) |
| `/partner/contact` | Contact form → Resend (`POST /api/partner/contact`) |
| `/onboarding` | Partner signup flow |
| `/sign-in`, `/sign-up` | Clerk |

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
| Aged leads marketplace (self-service, $5 unit) | PRD §5, call client | stub |
| Partner can edit target states post-onboarding | Review #1, PRD Q6 | ✗ |
| Modern Integrity-branded UI | PRD §11, proposal | partial |
| Unified refund workflow in-app | PRD innovation | stub |
| Post-refund routing (Type A / B) | PRD §5.8 | ✗ |
| Single domain for all partners | PRD constraint | ✓ |

---

## 4. Priority backlog (recommended build order)

### P0 — Makes the product feel "real" (mockup + backend)

1. **Admin Leads** — sub-views (Matched / Unmatched / Declined), date filter, lead detail drawer with timeline/log  
2. **Admin Partners** — detail page, approve/reject actions, edit priority/price/states, filter-set parity (or documented single-profile UX)  
3. **Partner My Leads** — lead detail, request refund button  
4. **Partner Wallet** — Stripe Checkout one-time top-up  
5. **Email delivery** on successful match (Resend)  
6. **CRM webhook** on match (`crmWebhookUrl`)  
7. **Admin Refunds** — approve/reject queue wired to ledger  

### P1 — Parity with Boberdoo lifecycle

8. Unmatched **reprocess job** (24h window)  
9. **Integrity ping/post** fallback (`resale_postings`)  
10. **Admin dashboard** — meaningful charts + unmatched alert  
11. **Partner Dashboard** — leads received today, balance, buying status  
12. **Filter List** admin view (global matching picture)  
13. **Lead Search** by ID / phone / email  
14. Partner **Reports** (transaction history)  
15. Complete **signup/onboarding** fields (phone, address, billing preference)  

### P2 — Innovation & polish

16. **Aged marketplace** (browse, filter, purchase, wallet debit)  
17. Partner **Settings** — edit states (min 15), CRM URL  
18. **Migration import** (Excel from Boberdoo export)  
19. Admin config screens (lead type default price, sources) — or `app_settings` UI  
20. Weekly billing recurrence (Stripe subscription)  

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
| Multiple filter sets per partner | Yes (2+ templates) | Single row on `Partner` | Add `FilterSet` table **or** document V1 single-profile |
| Filter set templates | Standard / High Intent COPY | `leadType` on partner | OK if one profile per type max |
| Lead status granularity | Review, Declined, Integrity variants | 5 enum values | Add `declined`, `review` **or** map in UI |
| Telymonde vendor | Active in prod ($20) | Not modeled | V1: Integrity only **or** generic `ResaleVendor` |
| Partner delivery credentials | Ringy SID/token per partner | Only `crmWebhookUrl` | Add `crmProvider` + encrypted credentials |
| Lead log / events | Rich timeline | None | Add `lead_events` table or JSON log |

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
- [x] Partner — Contact Us (form → Resend admin email + confirmation ; recipient in Admin Settings)  
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
BOBERDOO ADMIN                          OUR APP (today)
─────────────────────────────────────────────────────────
Home (charts, widgets)                  /admin (4 cards)
Settings → Lead Types, Sources,         (none)
  Vendors, Custom Deliveries
Outside Services (TrustedForm)          (none)
Leads (5 sub-views, actions)            /admin/leads (flat table)
Lead Search/Delete                      (none)
Aged Leads                              (none — partner /partner/aged stub)
Partners + detail + filter sets         /admin/partners (flat table)
Filter List                             (none)
Refunds                                 /admin/refunds (stub)
Billing & Reports                       (none)
─────────────────────────────────────────────────────────
PARTNER PORTAL
Dashboard                               /partner (3 cards)
My Leads                                /partner/leads
Add Funds / Wallet                      /partner/wallet (stub)
Aged Marketplace                        /partner/aged (stub) ← NEW
Settings / Reports / Contact            (none)
Public /signup                          /sign-up + /onboarding
```

---

*Maintained by TECHMA — update this file when screens or APIs land.*
