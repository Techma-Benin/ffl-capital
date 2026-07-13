# LeadConduit / ActiveProspect — local connection guide

> How to receive real leads from LeadConduit in local dev, and cut over from Boberdoo in production.

---

## What ActiveProspect is

**ActiveProspect** is the vendor behind:

- **LeadConduit** — middleware that receives form submissions (e.g. from Meta Lead Ads), enriches them, and **POSTs** them to a recipient URL.
- **TrustedForm** — consent certificate script embedded on landing pages. The certificate URL is included in the lead payload; our app **stores** it but does **not** generate it.

Our platform **does not pull** leads from ActiveProspect. It **only receives** HTTP POSTs at a public URL.

---

## Intake endpoint

| Item | Value |
|------|--------|
| Method | `POST` |
| Path | `/api/leads/intake` |
| Auth | None (public webhook; CORS enabled for LeadConduit) |
| Content-Type | `application/json` |

### Success response (LeadConduit contract)

```json
{
  "outcome": "success",
  "reason": ""
}
```

On validation or business errors, the API returns `{ "outcome": "error", "reason": "…" }` with an appropriate HTTP status.

### Payload format

Use **Boberdoo field names** (underscores). Example fields:

| Boberdoo field | Purpose |
|----------------|---------|
| `First_Name`, `Last_Name` | Contact |
| `Email`, `Primary_Phone` | Contact |
| `State` or `State_You_Currently_Live_In` | US state (matching) |
| `Intent` | `"High Intent"` → high-intent IUL |
| `Trusted_Form_URL` | TrustedForm certificate URL |
| `Unique_Identifier` | Idempotency / duplicate detection |
| `Lead_Type`, `SRC`, `Landing_Page`, `Sub_ID`, `Pub_ID` | Tracking |

Full example: `fixtures/boberdoo_iul_submit_lead.example.json`

### What happens after intake

1. Validate + normalize payload  
2. Duplicate check (by `Unique_Identifier` / phone+email)  
3. Optional TrustedForm URL validation  
4. Persist lead → matching engine → wallet debit → email + CRM/Ringy delivery  
5. Unmatched leads → cron reprocess (< 24h) → Integrity post (> 24h)

---

## Local development without LeadConduit

You do **not** need LeadConduit or ngrok to develop the intake pipeline.

| Tool | URL | Use |
|------|-----|-----|
| Lead simulator | `/dev/lead-simulator` | Form → POST `/api/leads/intake` (dev only) |
| Feeding platform | `/feeding-platform` | Static test UI for batch/manual submissions |
| CLI | `npm run seed:lead` | POST fixture JSON to intake |
| curl | — | POST `fixtures/boberdoo_iul_submit_lead.example.json` |

TrustedForm in dev: any HTTPS URL string is enough (e.g. `https://cert.trustedform.com/test-{uuid}`).

---

## Local development **with** LeadConduit

LeadConduit must reach your machine over the public internet.

### 1. Start the app

```bash
npm run dev
# App on http://localhost:3000
```

### 2. Expose localhost (ngrok or similar)

```bash
ngrok http 3000
```

Note the HTTPS URL, e.g. `https://abc123.ngrok-free.app`.

### 3. Configure LeadConduit recipient

In the **LeadConduit** UI (exact labels vary by account):

1. Open the **Flow** that currently sends leads to Boberdoo (or create a **staging/test** flow).
2. Add or edit a **Recipient** / **Integration** step.
3. Set the delivery method to **Custom** / **HTTP POST** / **Webhook** (wording depends on your LeadConduit plan).
4. Set **URL** to:

   ```
   https://YOUR-NGROK-HOST/api/leads/intake
   ```

5. Set **Method** to `POST`, **Content-Type** to `application/json`.
6. Map outbound fields to Boberdoo-style names (`First_Name`, `Trusted_Form_URL`, etc.) — mirror the existing Boberdoo mapping if you have it.
7. Save and **test** the flow (LeadConduit usually has a “test submission” or you can submit a test lead from Meta/staging source).

### 4. Verify

- Check server logs / admin **Leads** list for the new lead.
- Lead detail → **Event Log** should show `received`, then `matched` / `delivered` or `reprocessed`.

**Note:** Each time ngrok restarts, update the recipient URL in LeadConduit.

---

## Production cutover (Boberdoo → FFL Capital)

1. Deploy the app to staging/production with a stable HTTPS URL.
2. In LeadConduit, open the **production** flow that posts to Boberdoo.
3. Change the recipient URL from the Boberdoo endpoint to:

   ```
   https://YOUR-PRODUCTION-DOMAIN/api/leads/intake
   ```

4. Run a few test leads; confirm `{ "outcome": "success" }` and delivery in admin.
5. Monitor unmatched queue and partner wallets before disabling Boberdoo.

**TrustedForm:** No separate ActiveProspect API key is required on our side if LeadConduit already includes `Trusted_Form_URL` in the JSON body.

---

## Troubleshooting

| Issue | Check |
|-------|--------|
| LeadConduit shows delivery failure | Response body must include `"outcome":"success"`; check app logs for validation errors |
| CORS errors from browser | Intake is server-to-server; CORS only matters for browser-based tools |
| Duplicate rejected | Same `Unique_Identifier` submitted twice — expected idempotency |
| Lead unmatched | No active partner with matching state, type, balance, or ≥15 states |

---

## Related docs

- [BACKEND.md](BACKEND.md) — intake mapping and pipeline
- [PROJECT.md](PROJECT.md) — business flow Meta → LeadConduit → platform
- `fixtures/boberdoo_iul_submit_lead.example.json` — sample payload
