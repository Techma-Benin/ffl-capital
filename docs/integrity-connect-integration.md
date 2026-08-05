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

### Realtime state campaigns

Integrity Realtime only accepts leads from states with active campaigns. Our system skips (does not reject) Realtime posts for other states with reason `Integrity Realtime: no campaign for state {code}`.

| Eligible states (full names) |
|---|
| Utah, Montana, Wisconsin, Texas, Ohio, Michigan, Florida, Arizona |

A LeadConduit response of **"No Campaign Available"** for an ineligible state (e.g. Colorado) is expected — it means the state is not in Integrity's active Realtime campaigns, not a payload error.

Internal storage and partner matching continue to use 2-letter state codes; only Integrity outbound payloads use full state names via `formatStateForIntegrity()`.
| `postal_code` | postal_code | Zip code |
| `county` | string | County |
| `age` | range | Age |
| `dob` | date | Date of birth |
| `trustedform_cert_url` | trustedform_url | TrustedForm Certificate URL |
| `universal_leadid` | string | Jornaya's 36-character Universal Lead Token |
| `agent_id_thom` | string | Agent NPN (National Producer Number) |
| `agentemail_thom` | string | Agent email |
| `beneficiary_thom` | string | Name of beneficiary |
| `beneficiary_type_thom` | string | Spouse, Child, Mother, Father, Sibling |
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

### Ping (Storefront Only)

The Storefront flow supports a ping/post model: send a subset of fields first to check acceptance before submitting the full lead. Use the same submission URL. The RealTime flow does **not** support ping.

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

**Intake requirement:** `/api/leads/intake` rejects payloads missing `Trusted_Form_URL` (or `trustedform_cert_url`) with `{ outcome: "error", reason: "Missing required fields: …" }`. `DOB` is temporarily optional at intake (MP Facebook forms often omit it); `Have_IUL` / `Primary_Goal` are product-specific and not enforced at intake. Per-product completeness (including `DOB`) is checked before Integrity post via `src/lib/integrity/required-fields.ts`.

**Outbound payload shape:** `buildIntegrityLeadPayload` and `buildIntegrityStorefrontPayload` omit optional fields when the lead has no value. Exceptions and parity notes:

- `address_1` is **always** included (empty string when the lead has no address); `encodeIntegrityFormBody` keeps blank `address_1` in the form-urlencoded body.
- When DOB is present, both `dob` (`m/d/Y`) and `dob_mmddyyyy_thom` (`MM/dd/yyyy`) are sent.
- TrustedForm (`trustedform_cert_url`), Jornaya (`universal_leadid`), `has_iul_thom`, and `primary_goal_thom` are included when present.
- `lead_type_thom` comes from the lead category row only: Realtime uses `integrity_label`; Storefront uses `integrity_label_storefront`, then `integrity_label` on the same category (`resolveIntegrityLabelForMode`). Built-in defaults are seeded at deploy — see `pnpm db:sync-integrity-labels` and `integrity-label-defaults.ts`.
- Mortgage Protection–specific fields (`beneficiary_thom`, `history_of_cancer_thom`, `mortgage_loan_amount_thom`) are included only for `mortgage_protection` leads, and omitted when missing.
- Ping payloads (`buildIntegrityPingPayload`) include only `first_name`, `last_name`, `state`, `lead_type_thom`, and `vendor_lead_id_thom`.

| Internal Field | LeadConduit Parameter | Notes |
|---|---|---|
| `lead.firstName` | `first_name` | |
| `lead.lastName` | `last_name` | |
| `lead.email` | `email` | |
| `lead.phone` | `phone_1` | |
| `lead.state` | `state` | |
| `lead.dob` | `dob` | Format `m/d/Y` when present |
| `lead.dob` | `dob_mmddyyyy_thom` | Format `MM/dd/yyyy`; required before Integrity RealTime post |
| `lead.leadType` / category labels | `lead_type_thom` | RealTime: category Realtime label (or default IUL string); Storefront: Storefront label → Realtime → default |
| `lead.id` or `lead.externalId` | `vendor_lead_id_thom` | Required for Storefront |
| `lead.address` | `address_1` | Always sent; `""` when missing |
| `lead.city` | `city` | |
| `lead.zip` | `postal_code` | |
| `lead.trustedformCertUrl` | `trustedform_cert_url` | **Required at intake** |
| `lead.leadidToken` | `universal_leadid` | Jornaya token |
| `lead.ipAddress` | `ip_address` | |
| `lead.age` | `age` | |
| `lead.haveIul` | `has_iul_thom` | Send when present (`"yes"` / `"no"`) |
| `lead.primaryGoal` | `primary_goal_thom` | Send when present |
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

```
IF lead is new/realtime AND lead type maps to one of the 5 accepted RealTime types:
  → POST to INTEGRITY_REALTIME_SUBMIT_URL
  → Required: lead_type_thom, dob_mmddyyyy_thom, first_name, last_name, email, phone_1, state
  → No ping needed

ELSE IF lead is aged/unmatched:
  → (Optional) Ping to INTEGRITY_STOREFRONT_SUBMIT_URL first
  → POST to INTEGRITY_STOREFRONT_SUBMIT_URL
  → Required: lead_type_thom, first_name, last_name, phone_1, email, state, vendor_lead_id_thom
```

---

## Environment Variables

```env
INTEGRITY_REALTIME_SUBMIT_URL=https://app.leadconduit.com/flows/65c179646acc6f1fb9864345/sources/64e4ee92a3947cf03fa9dcea/submit
INTEGRITY_STOREFRONT_SUBMIT_URL=https://app.leadconduit.com/flows/60affe1a00048c6680c27719/sources/64e4ee92a3947cf03fa9dcea/submit
```

Both URLs are unique per flow per source — they cannot be swapped or reused.

---

## Testing

### Admin Integrity test panel (preferred)

`POST /api/admin/integrity/test` (admin session) builds a test payload for `realtime` or `storefront`, resolves the correct category label for that mode, and returns `encodedBody` / `encodedFields` so operators can confirm `address_1` (including blank) and both DOB fields before/after send. Manual payload overrides preserve blank `address_1`. See [LEADCONDUIT_SETUP.md](LEADCONDUIT_SETUP.md).

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

## Current Codebase Issues to Fix

The existing code at `src/lib/integrity/` has the following problems that must be corrected:

| # | Issue | What's Wrong | Fix |
|---|---|---|---|
| 1 | Wrong Content-Type | Sends `application/json` | Change to `application/x-www-form-urlencoded` |
| 2 | Wrong field names | Uses camelCase (`firstName`, `lastName`) | Use LeadConduit parameter names (`first_name`, `last_name`, `lead_type_thom`, etc.) |
| 3 | Missing required fields | Doesn't send `dob_mmddyyyy_thom` (RealTime) or `vendor_lead_id_thom` (Storefront) | Add these fields to the request payload |
| 4 | Single URL | Uses one `INTEGRITY_POST_URL` env var | Split into `INTEGRITY_REALTIME_SUBMIT_URL` and `INTEGRITY_STOREFRONT_SUBMIT_URL` |
| 5 | Incorrect ping logic | Pings before all posts | Only ping for Storefront flow; RealTime is direct submit only |
| 6 | Lead type mapping | Passes raw `lead.leadType` | Map to exact strings like `"Mortgage Protection Facebook (Realtime Lead)"` |

---

## Important Notes

- URLs are unique per flow per source — cannot be reused across flows
- No pricing or volume caps are configured on either flow
- The source ID (`64e4ee92a3947cf03fa9dcea`) is the same for both flows — it represents "Twardowski Enterprises Insurance Agency LLC"
- The receiving entity is "Integrity Marketing Group, LLC"
- In Boberdoo, this was set up as one custom delivery per lead type — our system should similarly route different lead types to the appropriate flow
- Boolean fields accept: `yes`, `no`, `true`, `false`, `1`, `0`
