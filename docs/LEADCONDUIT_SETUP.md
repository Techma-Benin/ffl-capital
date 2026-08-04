# LeadConduit / ActiveProspect — Setup & Integration Guide

> How to receive real leads from LeadConduit, secure the intake endpoint, post leads to Integrity Connect, and verify the integration end-to-end.

---

## Table of Contents

1. [Intake endpoint](#intake-endpoint)
2. [Securing the endpoint](#securing-the-endpoint)
3. [Field mapping tables](#field-mapping-tables)
4. [Posting to Integrity Connect](#posting-to-integrity-connect)
5. [Integrity response webhook](#integrity-response-webhook)
6. [Testing with is_test=yes](#testing-with-is_testyes)
7. [Local development](#local-development)
8. [Production cutover](#production-cutover)
9. [Troubleshooting](#troubleshooting)

---

## Intake endpoint

| Item | Value |
|------|--------|
| Method | `POST` |
| Path | `/api/leads/intake` |
| Auth | `X-Api-Key` header (see [Securing the endpoint](#securing-the-endpoint)) |
| Content-Type | `application/json` |

### Success response (LeadConduit contract)

```json
{
  "outcome": "success",
  "reason": ""
}
```

On validation or business errors: `{ "outcome": "error", "reason": "…" }` with an appropriate HTTP status.

---

## Securing the endpoint

The intake endpoint validates an `X-Api-Key` header against the `LEADCONDUIT_WEBHOOK_SECRET` environment variable.

### Server setup

1. Generate a strong random secret:
   ```bash
   openssl rand -hex 32
   ```
2. Set `LEADCONDUIT_WEBHOOK_SECRET` in your environment (Replit Secrets / production env).
3. When the env var is **not set**, the check is skipped — safe for local dev.

### LeadConduit configuration

In the LeadConduit flow's **delivery settings**:

1. Open the recipient/delivery step for your flow.
2. Under **Headers**, add a custom header:
   - **Name:** `X-Api-Key`
   - **Value:** the secret you generated above
3. Save and test the flow.

### Response on unauthorized

```json
{ "outcome": "error", "reason": "Unauthorized" }
```
HTTP status: `401`

---

## Field mapping tables

### IUL Flow (Boberdoo type 37) — all three active flows share these base fields

| LeadConduit field | Internal field | Notes |
|-------------------|---------------|-------|
| `First_Name` | `firstName` | Required |
| `Last_Name` | `lastName` | Required |
| `Email` | `email` | Required |
| `Primary_Phone` | `phone` | Required |
| `State` or `State_You_Currently_Live_In` | `state` | Required |
| `Intent` | `intent` | Stored on lead; does not set `leadType` |
| `SRC` | `source` | Also used in category criteria (`field=SRC`, exact match) |
| `DOB` | `dob` | Optional at intake (temporarily — MP Facebook forms often omit); required before Integrity post |
| `Age` | `age` | |
| `Trusted_Form_URL` (or `trustedform_cert_url`) | `trustedformCertUrl` | **Required** — TrustedForm certificate |
| `LeadiD_Token` | `leadidToken` | Jornaya token |
| `Unique_Identifier` | `externalId` | Idempotency / duplicate detection |
| `Lead_Type` | `boberdooLeadType` | Boberdoo numeric type (37, 35, 41) |
| `Landing_Page` | `landingPage` | |
| `Sub_ID` | `subId` | |
| `Pub_ID` | `pubId` | |
| `IP_Address` | `ipAddress` | |
| `User_Agent` | `userAgent` | |
| `TCPA_Consent` | `tcpaConsent` | |
| `TCPA_Language` | `tcpaLanguage` | |
| `Have_IUL` | `haveIul` | **Required** |
| `Primary_Goal` | `primaryGoal` | **Required** |

### Lead category rules (intake)

`leadType` is **not** inferred in `normalize-lead.ts`. At intake, `process-intake.ts` evaluates all **enabled** `lead_categories` against the **raw webhook payload** (top-level keys only; each criterion is an exact, case-sensitive string match; all criteria on a category must match).

| Outcome | `categoryResolution` | `leadType` | `status` | Partner matching | Integrity post |
|---------|---------------------|------------|----------|------------------|----------------|
| Exactly 1 category | `matched` | category `type` | `unmatched` (or `review` if TrustedForm fails) | yes | yes |
| 0 categories | `no_match` | `null` | `review` | skipped | skipped |
| 2+ categories | `multiple_matches` | `null` | `review` | skipped | skipped |

Default seeded criteria (migrated from former `lead_categories.src` column):

| Category `type` | Criterion |
|-----------------|-----------|
| `traditional_iul` | `SRC` = `IUL_LeadConduit` |
| `high_intent_iul` | `SRC` = `IUL_LeadConduit_HighIntent` |
| `mortgage_protection` | `SRC` = `Mortgage_LeadConduit` |
| `final_expense` | `SRC` = `Veteran_LeadConduit` |

Admin UI: `/admin/settings` → **Lead categories** — multi-criteria editor; internal `type` is server-generated from label (not supplied on create).

There is **no** implicit fallback from `Intent` or partial `SRC` matching; unmatched payloads require admin review or new category rules.

Creating or deleting an enabled category, changing criteria, or toggling `enabled` re-evaluates all non-finalized leads from their stored raw webhook payload with this same evaluator. Final statuses (`delivered`, `integrity_posted`, `aged_listed`, `dead`) are excluded. A newly unique match becomes `unmatched` and available for the normal reprocess flow; the category API itself does not immediately match or deliver it.

### Outbound field mapping (Internal → Integrity Connect / LeadConduit)

| Internal field | LeadConduit parameter | Notes |
|----------------|----------------------|-------|
| `lead.firstName` | `first_name` | |
| `lead.lastName` | `last_name` | |
| `lead.email` | `email` | |
| `lead.phone` | `phone_1` | |
| `lead.state` | `state` | |
| `lead.dob` | `dob_mmddyyyy_thom` | Formatted `MM/dd/yyyy`; **required for RealTime** |
| `lead.leadType` | `lead_type_thom` | Mapped to exact Integrity string (see below) |
| `lead.externalId ?? lead.id` | `vendor_lead_id_thom` | **Required for Storefront** |
| `lead.address` | `address_1` | |
| `lead.city` | `city` | |
| `lead.zip` | `postal_code` | |
| `lead.trustedformCertUrl` | `trustedform_cert_url` | |
| `lead.leadidToken` | `universal_leadid` | Jornaya token |
| `lead.ipAddress` | `ip_address` | |
| `lead.age` | `age` | |
| `lead.haveIul` | `has_iul_thom` | |
| `lead.primaryGoal` | `primary_goal_thom` | |
| `lead.source` | `campaign_source` | |
| `lead.subId` | `campaign_id` | |

### Lead type mapping → Integrity exact strings

| Internal `leadType` | `lead_type_thom` value sent to Integrity |
|---------------------|------------------------------------------|
| `mortgage_protection` | `Mortgage Protection Facebook (Realtime Lead)` |
| `final_expense` | `Final Expense Facebook (Realtime Lead)` |
| `traditional_iul` | `Indexed Universal Life [IUL] Facebook (Realtime Lead)` |
| `high_intent_iul` | `Indexed Universal Life [IUL] Facebook (Realtime Lead)` |

---

## Posting to Integrity Connect

### Environment variables

```env
# RealTime flow — direct submit, no ping required
INTEGRITY_REALTIME_SUBMIT_URL=https://app.leadconduit.com/flows/65c179646acc6f1fb9864345/sources/64e4ee92a3947cf03fa9dcea/submit

# Storefront flow — aged leads; ping and post use the same URL
INTEGRITY_STOREFRONT_SUBMIT_URL=https://app.leadconduit.com/flows/60affe1a00048c6680c27719/sources/64e4ee92a3947cf03fa9dcea/submit
```

Admin **Resale vendors** (`integrity_realtime`, `integrity_storefront`) override these URLs when `postUrl` is set. Each vendor has an **enabled** toggle — when disabled, posts are skipped (`integrity_skipped` lead event) and the lead stays `unmatched`. In dev, `INTEGRATIONS_MODE=mock` logs Integrity without HTTP and does not set `integrity_posted`; production always runs live for partner delivery and ignores `integrations_mode`.

### Routing logic

```
IF vendor (integrity_realtime | integrity_storefront) disabled:
  → Skip HTTP; emit integrity_skipped; lead stays unmatched

IF resaleMode = realtime:
  → POST to resolved integrity_realtime postUrl (DB or INTEGRITY_REALTIME_SUBMIT_URL)
  → Required fields: lead_type_thom, dob_mmddyyyy_thom, first_name, last_name, email, phone_1, state
  → No ping

IF resaleMode = storefront:
  → Optional ping to resolved integrity_storefront postUrl (same URL as post)
  → If ping accepted → POST full payload to same URL
  → Required fields: lead_type_thom, first_name, last_name, phone_1, email, state, vendor_lead_id_thom
```

### Protocol details

- **Content-Type:** `application/x-www-form-urlencoded` (NOT `application/json`)
- **Response format:** `{ "outcome": "success"|"failure"|"error", "lead": { "id": "..." }, "reason": "..." }`

---

## Integrity response webhook

LeadConduit can POST back a result after processing. This closes the loop: submit → receive result → update lead record.

### Endpoint

| Item | Value |
|------|--------|
| Method | `POST` |
| Path | `/api/webhooks/integrity` |
| Query param | `?postingId=<uuid>` — the `ResalePosting` record ID |
| Auth | `X-Api-Key` header matching `INTEGRITY_WEBHOOK_SECRET` |

### Setup in LeadConduit

1. In the delivery step's **response handling** or **outcome webhook** settings, configure a callback URL:
   ```
   https://YOUR-DOMAIN/api/webhooks/integrity?postingId={{posting_id}}
   ```
2. Add header `X-Api-Key: <INTEGRITY_WEBHOOK_SECRET value>`.
3. The platform always returns HTTP 200 (required for LeadConduit to mark delivery as successful).

### Behavior by outcome

| `outcome` | Action |
|-----------|--------|
| `success` | `ResalePosting` → `sold`; emits `integrity_accepted` event; records LeadConduit `lead.id` |
| `failure` | `ResalePosting` → `rejected`; emits `integrity_rejected` event with reason |
| `error` | Logs error; leaves `ResalePosting` as `pending` for retry; emits `integrity_error` event |

---

## Testing with is_test=yes

### Admin test route (preferred)

The platform provides a protected admin route for firing test submissions without storing any database records:

```
POST /api/admin/integrity/test
Authorization: admin session required
Body: { "flow": "realtime" | "storefront" }
```

Returns the raw LeadConduit response.

### Manual curl — RealTime flow

```bash
curl -X POST \
  "https://app.leadconduit.com/flows/65c179646acc6f1fb9864345/sources/64e4ee92a3947cf03fa9dcea/submit" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "lead_type_thom=Final+Expense+Facebook+(Realtime+Lead)&first_name=Mike&last_name=Jones&phone_1=5127891111&email=test@example.com&state=TX&dob_mmddyyyy_thom=06/02/1980&is_test=yes"
```

Expected response: `{"outcome":"success","lead":{"id":"..."}}`

### Manual curl — Storefront flow

```bash
curl -X POST \
  "https://app.leadconduit.com/flows/60affe1a00048c6680c27719/sources/64e4ee92a3947cf03fa9dcea/submit" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "lead_type_thom=Final+Expense&first_name=Mike&last_name=Jones&phone_1=5127891111&email=test@example.com&state=TX&vendor_lead_id_thom=TEST-001&is_test=yes"
```

Expected response: `{"outcome":"success","lead":{"id":"..."}}`

---

## Local development

### Without LeadConduit

| Tool | URL | Use |
|------|-----|-----|
| Lead simulator | `/dev/lead-simulator` | Form → POST `/api/leads/intake` (dev only) |
| Feeding platform | `/feeding-platform` | Static test UI for batch/manual submissions |
| CLI | `pnpm run seed:lead` | POST fixture JSON to intake |
| curl | — | POST `fixtures/boberdoo_iul_submit_lead.example.json` |

### With LeadConduit (ngrok)

1. Start the app: `pnpm dev`
2. Expose localhost: `ngrok http 3000`
3. Set the delivery URL in LeadConduit to: `https://YOUR-NGROK-HOST/api/leads/intake`
4. Add header `X-Api-Key: <your secret>` in the delivery step
5. Set Method to `POST`, Content-Type to `application/json`

---

## Production cutover

1. Deploy with stable HTTPS URL.
2. Set all required env vars: `LEADCONDUIT_WEBHOOK_SECRET`, `INTEGRITY_REALTIME_SUBMIT_URL`, `INTEGRITY_STOREFRONT_SUBMIT_URL`, `INTEGRITY_WEBHOOK_SECRET`.
3. In LeadConduit, update the recipient URL to `https://YOUR-DOMAIN/api/leads/intake`.
4. Add the `X-Api-Key` header in LeadConduit delivery settings.
5. Run test leads with `is_test=yes`; confirm `{ "outcome": "success" }`.
6. Monitor the unmatched queue and partner wallets before disabling Boberdoo.

---

## Troubleshooting

| Issue | Check |
|-------|--------|
| `401 Unauthorized` on intake | `X-Api-Key` header missing or doesn't match `LEADCONDUIT_WEBHOOK_SECRET` |
| LeadConduit shows delivery failure | Response must be `{"outcome":"success"}`; check app logs for validation errors |
| Integrity returns `"outcome":"failure"` | Check `reason` field; most common: missing `dob_mmddyyyy_thom` or wrong `lead_type_thom` value |
| CORS errors from browser | Intake is server-to-server; CORS headers are present but only matter for browser-based tools |
| Duplicate rejected | Same `Unique_Identifier` submitted twice — expected idempotency |
| Lead unmatched | No active partner with matching state, type, balance, or ≥15 states |

---

## Related docs

- [integrity-connect-integration.md](integrity-connect-integration.md) — full Integrity Connect spec and field reference
- [BACKEND.md](BACKEND.md) — intake mapping and pipeline
- [PROJECT.md](PROJECT.md) — business flow Meta → LeadConduit → platform
- `fixtures/boberdoo_iul_submit_lead.example.json` — sample payload
