# Integrity Connect / LeadConduit Integration Specification

> **Purpose:** This document contains everything needed to implement the Integrity Connect lead posting integration via ActiveProspect's LeadConduit platform. It covers both flows, all field mappings, acceptance criteria, routing logic, and known issues in the current codebase that must be fixed.

---

## Table of Contents

1. [Overview](#overview)
2. [Flow 1: RealTime (Priority)](#flow-1-realtime-priority)
3. [Flow 2: Storefront Marketplace (Aged Leads)](#flow-2-storefront-marketplace-aged-leads)
4. [HTTP Protocol](#http-protocol)
5. [Response Format](#response-format)
6. [Field Mapping (Internal → LeadConduit)](#field-mapping-internal--leadconduit)
7. [Decision / Routing Logic](#decision--routing-logic)
8. [Environment Variables](#environment-variables)
9. [Testing](#testing)
10. [Current Codebase Issues to Fix](#current-codebase-issues-to-fix)
11. [Important Notes](#important-notes)

---

## Overview

Integrity Marketing Group receives leads through two separate LeadConduit flows, each with its own submission URL, accepted lead types, and required fields. Our system must route leads to the correct flow based on lead type and freshness.

- **Receiving entity:** Integrity Marketing Group, LLC
- **Source identity:** Twardowski Enterprises Insurance Agency LLC (source ID `64e4ee92a3947cf03fa9dcea`, shared across both flows)
- **Platform:** ActiveProspect LeadConduit

---

## Flow 1: RealTime (Priority)

| Property | Value |
|---|---|
| Flow Name | ILC Real-Time Life SOCIAL Lead Routing |
| Submission URL | `https://app.leadconduit.com/flows/65c179646acc6f1fb9864345/sources/64e4ee92a3947cf03fa9dcea/submit` |
| HTTP Method | POST |
| Content-Type | `application/x-www-form-urlencoded` |
| Response Format | JSON |
| Ping Support | **No** — direct submit only |

### Accepted Lead Types (STRICT — must match exactly)

| Exact String Value |
|---|
| Mortgage Protection Facebook (Realtime Lead) |
| Final Expense Facebook (Realtime Lead) |
| Indexed Universal Life [IUL] Facebook (Realtime Lead) |
| Veteran Final Expense Lead (Realtime Lead) |
| Veteran Life Facebook (Realtime Lead) |

The `lead_type_thom` field **must** contain one of these exact strings or the lead will be rejected.

### Required Fields (Acceptance Criteria)

| HTTP Parameter | Type | Constraint |
|---|---|---|
| `lead_type_thom` | string | Must be one of the 5 accepted values above |
| `dob_mmddyyyy_thom` | string | Not blank, format: `MM/dd/yyyy` |
| `first_name` | first_name | Not blank |
| `last_name` | last_name | Not blank |
| `email` | email | Not blank |
| `phone_1` | phone | Not blank |
| `state` | state | Not blank |

### All Available Fields

| HTTP Parameter | Type | Description |
|---|---|---|
| `vendor_lead_id_thom` | string | Vendor's lead ID |
| `lead_type_thom` | string | Must be one of the 5 accepted lead types |
| `lead_date_thom` | date | e.g. 2014-06-02, 06/02/2014 |
| `first_name` | first_name | First name |
| `last_name` | last_name | Last name |
| `phone_1` | phone | First telephone number |
| `email` | email | Email address |
| `address_1` | street | First line of address |
| `address_2` | string | Second line (apt, unit) |
| `city` | city | City |
| `state` | state | Full state name on outbound posts (e.g. `Texas`, not `TX`) |
| `postal_code` | postal_code | Zip code |
| `county` | string | County |
| `age` | range | Age |
| `dob` | date | Date of birth |
| `trustedform_cert_url` | trustedform_url | TrustedForm Certificate URL |
| `universal_leadid` | string | Jornaya's 36-character Universal Lead Token |
| `agent_id_thom` | string | Agent NPN (National Producer Number) |
| `agentemail_thom` | string | Agent email |
| `beneficiary_thom` | string | Name of beneficiary |
| `beneficiary_type_thom` | string | Spouse, Child, Mother, Father, Sibling, Other (pass-through; not enum-validated) |
| `current_coverage_amount_thom` | string | Current coverage amount |
| `campaign_medium` | string | utm_medium equivalent |
| `campaign_name` | string | utm_campaign equivalent |
| `credit_rating` | string | excellent, good, fair, poor |
| `campaign_source` | string | utm_source equivalent |
| `coverage_type_options_thom` | string | Coverage type options |
| `insurance.currently_insured` | boolean | yes/no/true/false/1/0 |
| `current_carrier_thom` | string | Current insurance carrier |
| `desired_coverage_amount_thom` | string | Desired coverage amount |
| `dwelling_type_thom` | string | Dwelling type |
| `facevalue_thom` | string | Value of death benefit |
| `gender` | gender | female/F/Male/m/O/other |
| `insurance.height_ft` | number | Height feet portion |
| `insurance.height_in` | number | Height inches portion (0-11) |
| `hobby_thom` | string | Hobby |
| `has_coverage_thom` | boolean | yes/no/true/false/1/0 |
| `had_dui_thom` | boolean | yes/no/true/false/1/0 |
| `hazards_thom` | string | Hazards |
| `household_income_thom` | string | Household income |
| `home_phone_thom` | phone | Home phone |
| `has_iul_thom` | boolean | Does the lead already have IUL insurance? |
| `history_of_cancer_thom` | string | History of cancer? |
| `image_url_thom` | string | Image URL |
| `lead_type_program_thom` | string | Lead type program |
| `lender_thom` | string | Lender |
| `mortgage.loan.amount` | number | Mortgage loan amount (150000, $150,000) |
| `mortgage_date_thom` | date | Mortgage date |
| `major_medical_type_thom` | string | Major medical type |
| `is_military` | boolean | Military service? yes/no/true/false/1/0 |
| `marital_status` | string | married, not married, separated |
| `mobile_phone_thom` | number | Mobile phone |
| `notes_thom` | string | Notes |
| `original_source` | string | Original source of lead |
| `prescription_medications_thom` | string | Prescription medications |
| `product` | string | Product (e.g. "Home Loan", "RLCC-BS-D") |
| `primary_goal_thom` | string | Lead's primary goal |
| `reference` | string | External lead identifier |
| `is_smoker` | boolean | Smoker? yes/no/true/false/1/0 |
| `special_remark_thom` | string | Special remark |
| `source_timestamp` | time | When lead was captured by source |
| `tcpa_compliance_thom` | boolean | TCPA compliance |
| `insurance.weight` | number | Weight in pounds |
| `work_phone_thom` | phone | Work phone |
| `zip4_thom` | string | Zip+4 |
| `military_status` | string | active, none, reserves, veteran, spouse |
| `military_branch` | string | Air Force, Army, Coast Guard, Marine Corps, Navy |
| `dob_mmddyyyy_thom` | string | DOB in MM/dd/yyyy format **(REQUIRED)** |
| `price` | number | Lead price ($0.30, 1, 10.50, 12) |
| `middle_name` | string | Middle name |
| `salutation` | string | Mrs., Mister, Misses |
| `name_suffix` | string | Sr., Jr., III, PhD |
| `ip_address` | ip | IP address |
| `country` | string | United States, US, Canada, MX |
| `phone_2` | phone | Second phone |
| `company.name` | string | Company/employer name |
| `facebook_profile_url` | url | Facebook profile URL |
| `facebook.platform` | string | fb, ig, etc. |
| `facebook_photo_url` | url | Facebook photo URL |
| `facebook.page_id` | string | Facebook Page ID |
| `facebook.leadgen_id` | string | Facebook leadgen event ID |
| `facebook.is_organic` | boolean | Organic lead? |
| `facebook.opt_in` | boolean | Facebook opt-in? |
| `facebook_id` | string | Facebook ID |
| `facebook.form_id` | string | Facebook Form ID |
| `facebook.campaign_name` | string | Facebook campaign name |
| `facebook.campaign_id` | string | Facebook campaign ID |
| `facebook.adset_name` | string | Facebook ad set name |
| `facebook.adset_id` | string | Facebook ad set ID |
| `facebook.ad_name` | string | Facebook ad name |
| `facebook.ad_id` | string | Facebook ad ID |
| `facebook.adgroup_id` | string | Facebook ad group ID |
| `is_test` | boolean | Test lead flag (yes/no/true/false/1/0) |
| `campaign_id` | string | Campaign ID |
| `google.form_id` | string | Google Form ID |
| `google.creative_id` | string | Google creative ID |
| `google.adgroup_id` | string | Google ad group ID |
| `google.key` | string | Google key for validation |
| `google.clid` | string | Google Click Identifier (GCLID) |
| `company.monthly_sales` | range | Company monthly sales |
| `company.months_in_business` | range | Months in business |
| `company.number_employees` | range | Number of employees |
| `education_level` | string | Education level |
| `education.program` | string | Program of interest |
| `insurance.type` | string | Insurance type |
| `preferred_contact_method` | string | Email, Phone, Email or Phone |
| `property.type` | string | single family, multi family, condo, town home, coop, mobile home |
| `time_to_contact` | string | any time, morning, afternoon, evening |
| `timeframe_days` | number | Timeframe in days (30, 60, 90) |
| `title` | string | Job title |
| `service` | string | Service interested in |
| `vehicle.body_style` | string | Coupe, Sedan, SUV |
| `vehicle.condition` | string | Excellent, Good, Fair, Poor |
| `vehicle.model` | string | Vehicle model |
| `vendor_name` | string | Vendor name |
| `ad_type_thom` | string | Ad type responded to |
| `platform_submitted_thom` | string | Platform where ad came from |
| `otp_code_thom` | number | OTP code |
| `employment_status` | string | Employed, Self-Employed, Not Employed, Retired |
| `desired_monthly_contribution_thom` | range | Desired monthly contribution |
| `current_retirement_plan_thom` | string | Current retirement plan |
| `desired_retirement_age_thom` | number | Desired retirement age |
| `mortgage_balance` | number | Current mortgage balance |
| `redir_url` | url | Redirect URL after submission |

### Realtime state campaigns

All Realtime leads are posted to LeadConduit regardless of state. Integrity Realtime only accepts leads from states with active campaigns on their side — for other states, LeadConduit may return **"No Campaign Available"**. That is a rejection from LeadConduit, not a local skip. The platform records it as `integrity_no_campaign` (outcome `no_campaign_available`), distinct from generic `integrity_rejected` (outcome `rejected`).

| States with active Realtime campaigns (reference) |
|---|
| Utah, Montana, Wisconsin, Texas, Ohio, Michigan, Florida, Arizona |

The admin test panel displays this list for reference only; it does not gate outbound posts.

Internal storage and partner matching continue to use 2-letter state codes; only Integrity outbound payloads use full state names via `formatStateForIntegrity()`.

---

## Flow 2: Storefront Marketplace (Aged Leads)

| Property | Value |
|---|---|
| Flow Name | ILC Lead Order Life Lead Flow |
| Submission URL | `https://app.leadconduit.com/flows/60affe1a00048c6680c27719/sources/64e4ee92a3947cf03fa9dcea/submit` |
| HTTP Method | POST |
| Content-Type | `application/x-www-form-urlencoded` |
| Response Format | JSON |
| Ping Support | **Yes** — supports ping/post protocol |

### Lead Types

Free text — any value accepted (not restricted to a fixed list like RealTime).

### Required Fields (Acceptance Criteria)

| HTTP Parameter | Type | Constraint |
|---|---|---|
| `lead_type_thom` | string | Not blank (any text) |
| `first_name` | first_name | Not blank |
| `last_name` | last_name | Not blank |
| `phone_1` | phone | Not blank |
| `email` | email | Not blank |
| `state` | state | Not blank |
| `vendor_lead_id_thom` | string | Not blank |

### Fields Unique to Storefront (not in RealTime)

| HTTP Parameter | Type | Description |
|---|---|---|
| `agent.name` | string | Real estate agent's full name |
| `annualized_premium_thom` | string | Annualized insurance premium |
| `benebirthdecade_thom` | string | Beneficiary birth decade |
| `beneficiary_initial_fn_thom` | string | Beneficiary first name initial |
| `beneficiary_initial_ln_thom` | string | Beneficiary last name initial |
| `currently_rent_or_own` | string | rent/own |
| `email2` | email | Second email |
| `effective_date_thom` | date | Effective date |
| `has_children_thom` | boolean | Has children? |
| `has_dental_insurance_thom` | boolean | Has dental insurance? |
| `has_medicare_suppl_plan_thom` | boolean | Has Medicare supplement? |
| `has_medicare_thom` | boolean | Has Medicare? |
| `health_history_thom` | string | Health history |
| `heart_issue_thom` | boolean | Heart issue? |
| `home_owner_thom` | boolean | Home owner? |
| `interested_in_protecting_family_thom` | boolean | Interested in protecting family? |
| `interested_in_legacy_plan_thom` | boolean | Interested in legacy plan? |
| `leadid_id` | string | LeadiD ID (alternative to Jornaya token) |
| `loan_amount` | number | Loan amount |
| `monthly_payment_thom` | number | Monthly payment |
| `phone_3` | phone | Third phone |
| `policy_status_thom` | string | Policy status (e.g. "Inforce") |
| `policy_number_thom` | string | Policy number |
| `requested_coverage_date_thom` | date | Requested coverage date |
| `tobacco_use` | boolean | Tobacco use? |
| `vendor_id` | string | Vendor ID |
| `cost_coverage_for_thom` | string | Who is coverage for? |
| `language_preference_thom` | string | Language preference |

All shared fields from the RealTime flow are also accepted by this flow.

---

## HTTP Protocol

### Request

1. **Method:** `POST`
2. **Content-Type header:** `application/x-www-form-urlencoded`
3. **Body:** Standard URL-encoded key=value pairs (e.g. `first_name=Mike&last_name=Jones&state=TX`)
4. **DO NOT** send `application/json` — LeadConduit will reject or misparse it

### Ping (Storefront Only — LeadConduit)

The Storefront LeadConduit flow *can* support a ping/post model in the LeadConduit platform. **Our app does not use a LeadConduit ping gate for Storefront** — posts go directly to the submit URL.

### Ping (Realtime IUL — Azure)

Boberdoo delivery **281** pings Azure `IsAcceptingCampaign` before posting to the Realtime LeadConduit flow. **Our app mirrors this for Realtime IUL leads only** (`traditional_iul`, `high_intent_iul`, or types containing `iul`). Other Realtime categories and all Storefront posts skip the Azure ping.

- **URL:** `INTEGRITY_REALTIME_PING_URL` (prod: `https://ilc-functions-prod.azurewebsites.net/api/IsAcceptingCampaign`)
- **Headers:** `VendorId`, `x-functions-key`, `Content-Type: application/json`
- **Body:** `state`, `postal_code`, `lead_type_thom`
- **Success:** response body `true` (string)
- **Secrets:** env-only (`INTEGRITY_PING_VENDOR_ID`, `INTEGRITY_PING_FUNCTIONS_KEY`) — never stored in DB
- **Preflight:** `pnpm run preflight:integrity-azure`

---

## Response Format

All responses are JSON with an `outcome` field:

**Success:**
```json
{"outcome": "success", "lead": {"id": "..."}}
```

**Failure (lead rejected):**
```json
{"outcome": "failure", "reason": "explanation of why rejected"}
```

**Error (system error):**
```json
{"outcome": "error", "reason": "system error description"}
```

---

## Field Mapping (Internal → LeadConduit)

These are the mappings from our internal lead object properties to the LeadConduit HTTP parameter names.

**Intake requirement:** `/api/leads/intake` rejects payloads missing `Trusted_Form_URL` (or `trustedform_cert_url`) with `{ outcome: "error", reason: "Missing required fields: …" }`. `DOB` is temporarily optional at intake (MP Facebook forms often omit it); `Have_IUL` / `Primary_Goal` / Beneficiary Type are product-specific and not enforced at intake. Intake accepts beneficiary type from `beneficiary_type_thom`, `Beneficiary_Type`, `beneficiaryType`, or `Beneficiary Type` and persists it as `lead.beneficiaryType`. `src/lib/integrity/required-fields.ts` is **advisory only** (admin Integrity test panel lead-picker warnings) — it does **not** block outbound HTTP. Advisory product fields: **MP** → Beneficiary Type, History Of Cancer, Mortgage Loan Amount; **FE** → Beneficiary name; Realtime IUL also advisories `Have_IUL` / `Primary_Goal`.

**Boberdoo parity (outbound posts):** Automatic and admin-test posts always send HTTP to LeadConduit. There is no local pre-flight gate that skips the request for missing fields. LeadConduit accept/reject is recorded from the LC response body (`integrity_posted` / `integrity_rejected` / `integrity_no_campaign` when the reason contains "No Campaign Available"). Failures are further classified by `src/lib/integrity/classify.ts` for lifecycle routing (see below).

**Outbound payload shape:** `buildIntegrityLeadPayload` and `buildIntegrityStorefrontPayload` omit optional fields when the lead has no value. Exceptions and parity notes:

- `address_1` is **always** included (empty string when the lead has no address); `encodeIntegrityFormBody` keeps blank `address_1` in the form-urlencoded body.
- `dob` and `dob_mmddyyyy_thom` are **always** included (empty strings when DOB is blank); when present, formats are `m/d/Y` and `MM/dd/yyyy` respectively.
- TrustedForm (`trustedform_cert_url`) and Jornaya (`universal_leadid`) are included when present.
- `has_iul_thom` is sent for **IUL** leads only (empty string when blank); **not** included for Mortgage Protection. `primary_goal_thom` is included for IUL when present.
- `lead_type_thom` comes from the lead category row only: Realtime uses `integrity_label`; Storefront uses `integrity_label_storefront`, then `integrity_label` on the same category (`resolveIntegrityLabelForMode`). Built-in defaults are seeded at deploy — see `pnpm db:sync-integrity-labels` and `integrity-label-defaults.ts`.
- Mortgage Protection–specific fields (`beneficiary_type_thom`, `beneficiary_thom`, `history_of_cancer_thom`, `mortgage.loan.amount`, plus `monthly_payment_thom` from raw payload when present) are included only for `mortgage_protection` leads, and omitted when missing. `beneficiary_thom` remains backward-compatible when a name is present.
- Final Expense sends `beneficiary_thom` (name) only — **not** `beneficiary_type_thom`.
- Ping payloads (`buildIntegrityPingPayload`) include only `first_name`, `last_name`, `state`, `lead_type_thom`, and `vendor_lead_id_thom`. **Deprecated for Storefront** — app no longer pings LeadConduit before Storefront post.

| Internal Field | LeadConduit Parameter | Notes |
|---|---|---|
| `lead.firstName` | `first_name` | |
| `lead.lastName` | `last_name` | |
| `lead.email` | `email` | |
| `lead.phone` | `phone_1` | |
| `lead.state` | `state` | |
| `lead.dob` | `dob` | Format `m/d/Y` when present |
| `lead.dob` | `dob_mmddyyyy_thom` | Format `MM/dd/yyyy` when set; empty string when blank (LC RealTime acceptance criteria) |
| `lead.leadType` / category labels | `lead_type_thom` | RealTime: category Realtime label (or default IUL string); Storefront: Storefront label → Realtime → default |
| `lead.id` or `lead.externalId` | `vendor_lead_id_thom` | Required for Storefront |
| `lead.address` | `address_1` | Always sent; `""` when missing |
| `lead.city` | `city` | |
| `lead.zip` | `postal_code` | |
| `lead.trustedformCertUrl` | `trustedform_cert_url` | **Required at intake** |
| `lead.leadidToken` | `universal_leadid` | Jornaya token |
| `lead.ipAddress` | `ip_address` | |
| `lead.age` | `age` | |
| `lead.haveIul` | `has_iul_thom` | IUL leads only; empty string when blank; omitted for MP |
| `lead.primaryGoal` | `primary_goal_thom` | Send when present |
| `lead.beneficiaryType` | `beneficiary_type_thom` | MP only; pass-through (Spouse, Child, Mother, Father, Sibling, Other) |
| `lead.beneficiary` | `beneficiary_thom` | MP when present (compat); FE name field |
| `lead.historyOfCancer` | `history_of_cancer_thom` | MP only |
| `lead.mortgageLoanAmount` | `mortgage.loan.amount` | MP only |
| `lead.source` | `campaign_source` | |
| `lead.subId` | `campaign_id` | |

### Lead Type Mapping (Internal → RealTime Exact Strings)

The RealTime flow requires exact lead type strings. Prefer the category’s configured **Integrity Realtime label** (`integrity_label`); when blank, builders fall back to the default IUL Realtime string. Storefront uses **Integrity Storefront label** (`integrity_label_storefront`) with the same Realtime → default fallback chain.

Canonical Realtime strings (also useful as category defaults):

| Internal Lead Type | LeadConduit `lead_type_thom` Value |
|---|---|
| Mortgage Protection | `Mortgage Protection Facebook (Realtime Lead)` |
| Final Expense | `Final Expense Facebook (Realtime Lead)` |
| IUL / Indexed Universal Life | `Indexed Universal Life [IUL] Facebook (Realtime Lead)` |
| Veteran Final Expense | `Veteran Final Expense Lead (Realtime Lead)` |
| Veteran Life | `Veteran Life Facebook (Realtime Lead)` |

---

## Decision / Routing Logic

### Integrity post (per submission)

```
IF vendor disabled → skip (integrity_skipped)

IF resaleMode = realtime:
  → IF lead type is Realtime IUL → Azure IsAcceptingCampaign ping (env secrets)
  → POST to INTEGRITY_REALTIME_SUBMIT_URL (or vendor postUrl) — always HTTP; no local missing-field gate
  → LC RealTime acceptance criteria: lead_type_thom, dob_mmddyyyy_thom, first_name, last_name, email, phone_1, state
  → LC success (outcome success) → ResalePosting **sold** immediately (`soldAt`, `claimLiveSale`, `integrity_accepted`); not left `pending` for webhook
  → LC failure → integrity_rejected (outcome rejected) OR integrity_no_campaign (outcome no_campaign_available) when reason contains "No Campaign Available"; LC response body stored on event
  → classifyIntegrityFailure: NCA = retryable (lead unmatched + nextRoutingAttemptAt 15/30/60 min); other business failure = permanent Integrity block (both modes); 429/5xx/network = operational backoff

IF resaleMode = storefront:
  → POST directly to INTEGRITY_STOREFRONT_SUBMIT_URL (no LC ping gate) — always HTTP
  → LC Storefront acceptance criteria: lead_type_thom, first_name, last_name, phone_1, email, state, vendor_lead_id_thom
  → LC success → same immediate sold path as Realtime
  → LC failure → integrity_rejected or integrity_no_campaign (same detection as Realtime); same classifyIntegrityFailure rules; LC response body stored on event
```

### Integrity failure taxonomy (`classify.ts`)

| Class | Trigger | Lifecycle effect |
|-------|---------|------------------|
| `retryable_no_campaign` | Normalized reason « No Campaign Available » | Restore `unmatched`; cron backoff 15 / 30 / 60 min (`noCampaignBackoffMinutes`); Integrity may retry while in window |
| `terminal_business_rejection` | Other LC business failure | Set `integrityBlockedAt` + reason; **no further auto Realtime or Storefront posts** (cron does not retry Integrity); continue via partners in partner-capable windows; manual Reprocess on posting modal still available |
| `operational_failure` | Network error, HTTP 429 / 5xx (and similar transport) | Technical backoff (5 / 10 / 20 min); no permanent block |

Async webhook rejections use the same classifier. Webhook `success` is idempotent if the posting was already marked sold on sync submit.

### Unmatched lead routing (`lifecycle_routing_enabled`, default OFF)

| Flag | Behavior |
|------|----------|
| **Off** | **Partner-only** — partner match only; **never** Integrity Realtime or Storefront |
| **On** | Age windows via `src/lib/lead-routing/policy.ts` |

When enabled, policy uses lead age, `liveSoldAt`, Integrity posting state, and `integrityBlocked`:

| Age | Primary action |
|-----|----------------|
| 0 – 24 h | Integrity Realtime only (blocked → wait for partner-capable window) |
| 24 – 48 h | Partner **or** Storefront first (admin `lifecycle_mid_window_primary`), then fallback; Integrity blocked → partner only |
| 48 h – 30 d | Platform partners only (`lifecycle_partner_auto_reprocess_enabled`) |
| 30 d+ | Aged marketplace (passive); excluded from automatic live queue |
| `liveSoldAt` set | No automatic live routing |

Fair work queue (`work-queue.ts`): independent due queries per window, DB claim leases, partner-miss backoff. Preview without side effects: `POST /api/admin/lead-routing/preview`.

Legacy key `integrity_post_delay_hours` is retained in settings for rollback only — not used by the active path.

---

## Environment Variables

```env
INTEGRITY_REALTIME_SUBMIT_URL=https://app.leadconduit.com/flows/65c179646acc6f1fb9864345/sources/64e4ee92a3947cf03fa9dcea/submit
INTEGRITY_STOREFRONT_SUBMIT_URL=https://app.leadconduit.com/flows/60affe1a00048c6680c27719/sources/64e4ee92a3947cf03fa9dcea/submit

# Azure IsAcceptingCampaign — Realtime IUL only; env-only (never DB)
INTEGRITY_REALTIME_PING_URL=https://ilc-functions-prod.azurewebsites.net/api/IsAcceptingCampaign
INTEGRITY_PING_VENDOR_ID=
INTEGRITY_PING_FUNCTIONS_KEY=
```

After pull: `pnpm run ensure:integrity-env` fills blank public Integrity defaults into `.env` (URLs + VendorId; never writes the functions key). Hooked from `scripts/post-merge.sh`. Set `INTEGRITY_PING_FUNCTIONS_KEY` in Replit Secrets or `.env`. See [LEADCONDUIT_SETUP.md](LEADCONDUIT_SETUP.md).

Admin **Resale vendors** can override submit URLs. Azure ping secrets are **not** stored in `resale_vendor_configs` — env only.

---

## Testing

### Azure ping preflight

```bash
pnpm run preflight:integrity-azure
```

Requires `INTEGRITY_REALTIME_PING_URL`, `INTEGRITY_PING_VENDOR_ID`, `INTEGRITY_PING_FUNCTIONS_KEY`. Output is redacted — no secret values printed.

### Admin Integrity test panel (preferred)

`POST /api/admin/integrity/test` (admin session) builds a test payload for `realtime` or `storefront`, resolves the correct category label for that mode, and **always** POSTs real HTTP to LeadConduit with `is_test=yes` (mock and live integrations mode). The Connection test UI opens the **Review payload** modal (`integrity-payload-edit-modal.tsx`) before send; optional `{ manualPayload }` overrides preserve blank `address_1`. Editable keys include `beneficiary_type_thom` and `beneficiary_thom` (prefilled from the lead when present). (PostingModal Reprocess does **not** use this modal.) Returns the raw LC response plus `encodedBody` / `encodedFields` so operators can confirm `address_1` (including blank) and both DOB fields. `checkRequiredIntegrityFields` warnings are advisory in the lead picker only. See [LEADCONDUIT_SETUP.md](LEADCONDUIT_SETUP.md).

### Admin Integrity posting reprocess

Posting detail **Reprocess** POSTs immediately to `POST /api/admin/integrity/postings/[id]/reprocess` (admin session; loading on button). Re-sends through the real Integrity post path (`adminReprocessIntegrityPosting` → `integrityPostLead` with `forceAdminRetry` + `postingId`; refreshes `postedAt`). Mode always comes from the existing posting (never switches Realtime ↔ Storefront). Blocked when the lead has `liveSoldAt` or the posting is `sold`. Still respects vendor enabled and mock `is_test` behavior. On success the PostingModal closes; on error it stays open with a toast. Shared **Review payload** modal (`IntegrityPayloadEditModal`) remains for Connection test only — not used by Reprocess.

### General Approach

1. Include `is_test=yes` in your POST body — tells LeadConduit the data is fake/test
2. Verify you get `"outcome": "success"` back
3. If you get `"outcome": "failure"`, the `"reason"` field tells you exactly what's wrong

### Sample Test: RealTime

```bash
curl -X POST \
  "https://app.leadconduit.com/flows/65c179646acc6f1fb9864345/sources/64e4ee92a3947cf03fa9dcea/submit" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "lead_type_thom=Final+Expense+Facebook+(Realtime+Lead)&first_name=Mike&last_name=Jones&phone_1=5127891111&email=test@example.com&state=Texas&dob_mmddyyyy_thom=06/02/1980&is_test=yes"
```

### Sample Test: Storefront

```bash
curl -X POST \
  "https://app.leadconduit.com/flows/60affe1a00048c6680c27719/sources/64e4ee92a3947cf03fa9dcea/submit" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "lead_type_thom=Final+Expense&first_name=Mike&last_name=Jones&phone_1=5127891111&email=test@example.com&state=TX&vendor_lead_id_thom=TEST-001&is_test=yes"
```

---

## Current Codebase Status (Aug 2026)

The items below were fixed in Phase 1–2 and the reliable routing pass (août 2026). Remaining work is **live credential rotation**, **preflight**, and **controlled lifecycle flag enablement**.

| # | Issue | Status |
|---|---|---|
| 1 | Wrong Content-Type | ✅ `application/x-www-form-urlencoded` |
| 2 | Wrong field names | ✅ LeadConduit snake_case params |
| 3 | Missing required fields | ✅ `dob_mmddyyyy_thom`, `vendor_lead_id_thom` |
| 4 | Single URL | ✅ Split realtime / storefront vendors + env fallbacks |
| 5 | Incorrect ping logic | ✅ Azure ping for Realtime IUL only ; Storefront direct post |
| 6 | Lead type mapping | ✅ Category `integrity_label` / `integrity_label_storefront` |

---

## Important Notes

- URLs are unique per flow per source — cannot be reused across flows
- No pricing or volume caps are configured on either flow
- The source ID (`64e4ee92a3947cf03fa9dcea`) is the same for both flows — it represents "Twardowski Enterprises Insurance Agency LLC"
- The receiving entity is "Integrity Marketing Group, LLC"
- In Boberdoo, this was set up as one custom delivery per lead type — our system should similarly route different lead types to the appropriate flow
- Boolean fields accept: `yes`, `no`, `true`, `false`, `1`, `0`
