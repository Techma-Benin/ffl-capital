# Lead Flow & Categorization — Integration Notes

Context from July 13 call analysis and Active Prospect / Boberdoo exploration.

---

## 1. High Intent vs Traditional IUL Categorization

**Status: Already handled — no action needed.**

The lead normalizer (`src/lib/intake/normalize-lead.ts`) resolves lead type using two signals:

1. **Primary — `Intent` field:** if the value contains "high intent", the lead is classified as `high_intent_iul`
2. **Fallback — `SRC` field:** if SRC contains "highintent" or "high_intent" (e.g. `IUL_LeadConduit_HighIntent`), it also resolves to `high_intent_iul`
3. **Default:** if neither matches → `traditional_iul`

The client confirmed (call 13-7, minute 6:09) that high intent and regular IUL **share the same Active Prospect flow** (Facebook Boberdoo) and the **same Facebook page**. Differentiation happens via a Facebook **form type** field that Boberdoo uses to route into the correct filter set template. However, the client is **not currently running high intent leads** — the mechanism exists but is inactive.

The client agreed (minute 13:00) to potentially create a **separate Facebook page** for high intent to make it cleaner. Either approach will work with our existing normalizer.

---

## 2. The Three Active Prospect Flows

| Flow Name | Lead Type | Boberdoo Type ID | Status |
|-----------|-----------|-----------------|--------|
| Facebook Boberdoo | IUL (Traditional + High Intent) | 37 | **Active** (~500 leads/day) |
| Facebook Freedom Financial | Mortgage Protection | 35 | Configured, low/no volume |
| Facebook Independent Financial | Final Expense | 41 | Configured, low/no volume |

Each flow has its own Facebook page, spec URL, and API key. There is also a **Facebook > Zapier** flow but it is **deactivated**.

---

## 3. Mortgage Protection & Final Expense — Must Integrate

The client (call 13-7, minute 3:03) mentioned Mortgage Protection and Final Expense are "not as important or as needed" — but then at minute 4:04 walked through the full technical details of how they are differentiated (own Facebook pages, own spec URLs, own API keys, own Boberdoo lead type numbers). This indicates the client expects these to be part of the platform.

**Action needed (not now, after IUL is solid):**
- Add `mortgage_protection` and `final_expense` to the `LeadType` enum in Prisma schema
- Update the normalization logic to recognize them (can use the `TYPE` numeric ID or a new dedicated field)
- Create filter set templates for partners
- Duplicate the two remaining Active Prospect flows with JSON nodes pointing to our endpoint

---

## 4. The TYPE Field (Boberdoo Numeric Lead Type ID)

The Active Prospect XML payload to Boberdoo includes a `TYPE` field with numeric values that map to Boberdoo lead types:

| TYPE Value | Meaning |
|-----------|---------|
| 37 | IUL |
| 43 | IUL2 (secondary, unclear usage) |
| 35 | Mortgage Protection |
| 33 | Life Insurance |
| 39 | Veteran |
| 41 | Final Expense |
| 9 | Inbound Phone |

**Implementation status:** The field is already captured in our database as `boberdooLeadType` (column `boberdoo_lead_type` in the leads table). The intake validates it as `Lead_Type` and the normalizer stores it via `pickString(payload.Lead_Type, payload.leadTypeBoberdoo, payload.boberdooLeadType)`. Keep as-is — no changes needed.

---

## 5. Active Prospect Integration Approach

The existing Boberdoo XML nodes in Active Prospect **cannot be duplicated** for our flows because there is already an XML node in the flow. Instead:

- **Create new JSON nodes** in each flow, configured with our endpoint URL and API credentials
- The duplicated IUL flow (Facebook Boberdoo) is already done with a JSON node
- The other two flows (Freedom Financial for MP, Independent Financial for FE) need the same treatment when ready

---

## 6. Boberdoo Sources for IUL (Lead_Type=37)

| Source Name | Role |
|------------|------|
| `IUL_LeadConduit` | Main Meta intake via LeadConduit |
| `IUL_LeadConduit_HighIntent` | High-intent variant |
| `IUL_Zapier` | Alternative Zapier intake (flow is deactivated in Active Prospect) |
| `2nd_chance` | Re-uploaded / second-pass leads |

---

## 7. IUL2 and IUL_Zapier — Unknown Purpose

- **IUL2** (Boberdoo type 43): configured in Boberdoo with Ringy CRM credentials, but purpose and usage are unclear
- **IUL_Zapier**: listed as a Boberdoo source but the corresponding Zapier flow in Active Prospect is deactivated and its JSON endpoint doesn't include SRC or equivalent fields

**Action:** Ask the client for clarification on both, or investigate further in Boberdoo.

---

## 8. Proposed New Field: "Lead Type" (Broader)

The current `LeadType` enum only has `traditional_iul` and `high_intent_iul`. To support Mortgage Protection and Final Expense, we will need to expand it. Consider renaming or restructuring to accommodate a broader categorization (e.g. a "product type" concept separate from intent level).

**Not to implement now** — document for future sprint when MP and FE flows go live.

---

## Source References

- `docs/update_call_13-7` — July 13 client call transcript (minutes 3:03–13:55)
- `docs/BOBERDOO_EXPLORATION.md` — Sections 3, 4, 24, 25
- `src/lib/intake/normalize-lead.ts` — Lead type resolution logic
- `prisma/schema.prisma` — `boberdooLeadType` field (line ~190)
- `docs/BOBERDOO_GAP_ANALYSIS.md` — Filter set templates, lead type selectors
