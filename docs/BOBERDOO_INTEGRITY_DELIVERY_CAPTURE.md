# Boberdoo Integrity Custom Delivery — Field Mapping Capture

> **Capture date:** 4 Aug 2026 (live form read)  
> **Source:** Boberdoo Custom Deliveries Wizard (`pageID=83`) — all lead types with Integrity deliveries  
> **URL:** `https://capitalleads.leadportal.com/new_admin/adminpage.php?pageID=83`  
> **Method:** Edit → Continue (Get/Post) → read form fields in iframe

---

## Capture status

| Item | Status |
|------|--------|
| Live form read (Aug 4 evening) | **DONE** — all Integrity deliveries below |
| Gateway URLs + ping endpoints | **Captured** |
| Field mappings + hardcoded values | **Captured** |
| Hard Code PHP (Integrity API headers) | **Captured** (281 / 289 / 287) |
| MP / Veteran / Final Expense | **Captured** |

---

## Architecture (how Boberdoo talks to Integrity)

Almost every “Integrity” delivery is a **two-hop** setup:

1. **Post** → ActiveProspect **LeadConduit** (shared source `64e4ee92a3947cf03fa9dcea`)
2. **Ping** (only when `isPingPost=Yes`) → Integrity Azure Function `IsAcceptingCampaign` with `VendorId` + `x-functions-key`

| Role | URL pattern |
|------|-------------|
| LeadConduit **Storefront** (aged / marketplace) | `…/flows/60affe1a00048c6680c27719/sources/64e4ee92a3947cf03fa9dcea/submit` |
| LeadConduit **Realtime** | `…/flows/65c179646acc6f1fb9864345/sources/64e4ee92a3947cf03fa9dcea/submit` |
| Integrity ping **PROD** | `https://ilc-functions-prod.azurewebsites.net/api/IsAcceptingCampaign` |
| Integrity ping **DEV** | `https://ils-funtions-dev.azurewebsites.net/api/IsAcceptingCampaign` (typo `funtions` in their DNS) |

**Post success:** JSON path `outcome` = `success`  
**Price (when enabled):** JSON path `price` (`isPayDayJSON=Yes`)  
**Ping success (281):** response string `true`

### Integrity ping credentials (from Hard Code PHP on 281)

| Header | Value |
|--------|-------|
| `VendorId` | `1086` |
| `x-functions-key` | `[REDACTED — rotate before live use; store only in production secrets]` (PROD on 281) |
| `Content-Type` | `application/json` |

DEV key (on 289 / 287): `[REDACTED — rotate before live use; store only in production secrets]`

Ping body (inferred from 287 PHP + 281 mappings): `state`, `postal_code`, `lead_type_thom` (and headers above). On 281, `state` + `zip` are mapped **Both Ping/Post**.

---

## Delivery inventory (Integrity only)

### IUL — lead type 37

| ID | Name | Assigned | Ping/Post | Post flow | Ping URL | `lead_type_thom` |
|----|------|----------|-----------|-----------|----------|------------------|
| **281** | Integrity - Ping/Post - Real Time IUL | Yes | **Yes** | Realtime LC | **PROD** `ilc-functions-prod…` | `Indexed Universal Life [IUL] Facebook (Realtime Lead)` |
| **273** | Integrity - DirectPost - IUL | Yes | No | Storefront LC | — | *(same pattern as other storefront; confirm hardcoded on re-open if needed — mappings match storefront field set)* |
| 289 | Integrity - DirectPost - Real Time IUL | No | No | Realtime LC | DEV ping leftover in form | `Indexed Universal Life [IUL] Facebook (Realtime Lead)` |
| 287 | Integrity - DirectPost - Real Time IUL NA | No | Yes* | Realtime LC | Ping done in Hard Code PHP → DEV | `Indexed Universal Life [IUL] Facebook (Realtime Lead)` |

\*287 uses custom PHP curl to DEV ping instead of normal gateway ping fields.

**Notes ticket (IUL):** `ticketid=191399`

### Mortgage Protection — lead type 35

| ID | Name | Assigned | Post flow | `lead_type_thom` |
|----|------|----------|-----------|------------------|
| **325** | Mortgage Protection Integrity Marketplace (Realtime Lead) | Yes | Storefront LC | `Mortgage Protection Facebook (Realtime Lead)` |
| **319** | Mortgage Protection Integrity Marketplace | Yes | Storefront LC | `Diamond Mortgage Protection Lead` |
| 275 | Integrity - DirectPost - Mortgage Protection | No | Storefront LC | `Diamond Mortgage Protection Lead` |
| 271 | Integrity - DirectPost - Realtime Mortgage Protection | No | Realtime LC | `Mortgage Protection Facebook (Realtime Lead)` |

325/319 Hard Code PHP: extract TrustedForm cert id → `vendor_lead_id_thom = $our['certId']`.

### Veteran — lead type 39

| ID | Name | Assigned | Post flow | `lead_type_thom` |
|----|------|----------|-----------|------------------|
| **283** | Integrity - DirectPost - Veteran FE (Realtime) | Yes | Realtime LC | `Veteran Final Expense Lead (Realtime Lead)` |
| **277** | Integrity - DirectPost - Veteran FE | Yes | Storefront LC | `Veteran Final Expense Lead` |

### Final Expense — lead type 41

| ID | Name | Assigned | Post flow | `lead_type_thom` |
|----|------|----------|-----------|------------------|
| 279 | Integrity - DirectPost - Final Expense | No | Storefront LC | `Final Expense` |

### Empty / no Integrity

| Lead type | ID | Deliveries |
|-----------|-----|------------|
| IUL2 | 43 | Partner only (GHL / Ringy / Sheet) — **no Integrity** |
| Life Insurance | 33 | Empty |
| Inbound Phone | 9 | Empty |

---

## Field mappings — IUL (281 Ping/Post Realtime) — **confirmed**

| Boberdoo source | LeadConduit param | Ping/Post |
|-----------------|-------------------|-----------|
| `first_name_37` | `first_name` | Post |
| `last_name_37` | `last_name` | Post |
| `address_37` | `address_1` | Post |
| `city_37` | `city` | Post |
| `state_37` | `state` | **Both** |
| `zip_37` | *(ping both; post dest may be empty on 281 — 287 maps `postal_code`)* | **Both** (281) |
| `primary_phone_37` | `phone_1` | Post (`xxxxxxxxxx`) |
| `email_37` | `email` | Post |
| `dob_37` | `dob` | Post (`m/d/Y`) |
| `age_37` | `age` | Post |
| `tcpa_consent_37_txt` | `tcpa_compliance_thom` | Post |
| `trusted_form_url_37` | `trustedform_cert_url` | Post |
| `leadid_token_37` | `universal_leadid` | Post |
| `have_iul_37_txt` | `has_iul_thom` | Post |
| `primary_goal_37` | `primary_goal_thom` | Post |
| `dateCreated` | `lead_date_thom` | Post (`Y-m-d H:i:s`) |
| `leadID` | `vendor_lead_id_thom` | Post |

**Hardcoded (281):**

| Key | Value | Scope |
|-----|-------|-------|
| `lead_type_thom` | `Indexed Universal Life [IUL] Facebook (Realtime Lead)` | Both Ping/Post |
| `dob_mmddyyyy_thom` | `$our['DOB']` | Both Ping/Post |

**Also:** `jsonEncode=Yes`; PHP sets `skipJsonEncodingForArray = ['lead_type_thom']`.

### Storefront IUL (273) — confirmed earlier same session

Same LeadConduit storefront URL; DirectPost (`isPingPost=No`); response `outcome=success`; price path `price`. Core person/compliance mappings match 281 (`first_name`, `address_1`, `trustedform_cert_url`, `has_iul_thom`, `primary_goal_thom`, `vendor_lead_id_thom`, etc.).

---

## Field mappings — Mortgage Protection (325 Realtime Marketplace) — **confirmed**

| Boberdoo source | LeadConduit param |
|-----------------|-------------------|
| `ip_address_35` | `ip_address` |
| `tcpa_consent_35_txt` | `tcpa_compliance_thom` |
| `trusted_form_url_35` | `trustedform_cert_url` |
| `leadid_token_35` | `universal_leadid` |
| `first_name_35` / `last_name_35` | `first_name` / `last_name` |
| `address_35` / `city_35` / `state_35` / `zip_35` | `address_1` / `city` / `state` / `postal_code` |
| `primary_phone_35` / `email_35` | `phone_1` / `email` |
| `dob_35` | `dob_mmddyyyy_thom` |
| `age_35` | `age` |
| `monthly_mortgage_payment_35_txt` | `monthly_payment_thom` |
| `mortgage_loan_amount_35_txt` | `mortgage.loan.amount` |
| `name_of_beneficiary_35` | `beneficiary_thom` |
| `dateCreated` | `lead_date_thom` |

Hardcoded: `lead_type_thom`, `vendor_lead_id_thom=$our['certId']` (from TrustedForm URL basename).

275 also maps `history_of_cancer_35_txt` → `history_of_cancer_thom`.

---

## Field mappings — Veteran (283 Realtime) — **confirmed**

| Boberdoo source | LeadConduit param |
|-----------------|-------------------|
| `tcpa_consent_39_txt` | `tcpa_compliance_thom` |
| `trusted_form_url_39` | `trustedform_cert_url` |
| `first_name_39` / `last_name_39` | `first_name` / `last_name` |
| `state_39` | `state` |
| `primary_phone_39` / `email_39` | `phone_1` / `email` |
| `dob_39` | `dob_mmddyyyy_thom` |
| `age_39` | `age` |
| `military_service_39_txt` | `is_military` |
| `name_of_beneficiary_39` | `beneficiary_thom` |
| `dateCreated` | `lead_date_thom` |
| `leadID` | `vendor_lead_id_thom` |

---

## Field mappings — Final Expense (279) — **confirmed**

Standard contact + `beneficiary_thom` + `lead_type_thom=Final Expense` + storefront LC URL. Not assigned.

---

## Weighted delivery (from prior lead log)

| Broker | brokerID | Priority | Wizard ID |
|--------|----------|----------|-----------|
| ILC Storefront | 3 | 8 | 273 |
| ILC Realtime | 19 | 9 | 281 |

Boberdoo tries Realtime first; on reject / no campaign, falls back to Storefront.

---

## Implications for our app

1. **Post target is LeadConduit**, not IntegrityCONNECT HTTP directly — except the **ping** gate on realtime IUL (281).
2. Use exact `lead_type_thom` strings from the table above (Realtime vs Storefront differ for Veteran / MP).
3. Realtime IUL needs Integrity ping (`VendorId` 1086 + prod function key) **before** LC post when mirroring 281.
4. Shared LeadConduit source id: `64e4ee92a3947cf03fa9dcea`.
5. Success: JSON `outcome === "success"`; price from `price` when payday JSON enabled.
