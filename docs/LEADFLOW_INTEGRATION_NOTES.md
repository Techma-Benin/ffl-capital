# Lead Flow & Categorization — Integration Notes

Context from July 13 call analysis and Active Prospect / Boberdoo exploration.

---

## 1. Lead categorization at intake

**Status: implemented (July 2026) — flexible admin rules.**

`normalize-lead.ts` no longer assigns `leadType`. At intake, `process-intake.ts` calls `evaluateLeadCategories` (`src/lib/lead-categories/flexible-lead-categories.ts`) against the **raw webhook payload** and all **enabled** rows in `lead_categories` (with child `lead_category_criteria`).

- Each criterion is an exact, case-sensitive match on a top-level payload key (`field` + `value`).
- All criteria on a category must match (AND).
- Exactly one category → `lead.leadType` = that category’s `type`, `categoryResolution = matched`, normal matching proceeds.
- Zero or multiple categories → `status = review`, `leadType = null`, partner matching and Integrity post are skipped.

Default SRC-based rules were backfilled from the former `lead_categories.src` column (e.g. `IUL_LeadConduit` → `traditional_iul`). There is **no** implicit fallback from `Intent` or partial SRC strings.

Admin configures categories at `/admin/settings` → **Lead categories**.

Rule changes also re-evaluate existing non-finalized leads from `rawPayload` with the same evaluator. Creating/deleting an enabled category or changing criteria/`enabled` synchronizes `leadType`, resolution, candidates, status, and availability; `delivered`, `integrity_posted`, `aged_listed`, and `dead` leads are never changed. A newly unique match returns to `unmatched` / available for later reprocessing, without immediate matching or delivery.

The client confirmed (call 13-7, minute 6:09) that high intent and regular IUL share the same Active Prospect flow; differentiation is via form/source fields. Either a separate Facebook page or distinct SRC values remain compatible — configure matching criteria in admin.

---

## 2. The Three Active Prospect Flows

| Flow Name | Lead Type | Boberdoo Type ID | Status |
|-----------|-----------|-----------------|--------|
| Facebook Boberdoo | IUL (Traditional + High Intent) | 37 | **Active** (~500 leads/day) |
| Facebook Freedom Financial | Mortgage Protection | 35 | Configured, low/no volume |
| Facebook Independent Financial | Final Expense | 41 | Configured, low/no volume |

Each flow has its own Facebook page, spec URL, and API key. There is also a **Facebook > Zapier** flow but it is **deactivated**.

---

## 3. Mortgage Protection & Final Expense

**Status: categories exist in `lead_categories` (`mortgage_protection`, `final_expense`) with SRC criteria; full flow cutover when client routes those Active Prospect JSON nodes to our endpoint.**

The client (call 13-7) expects MP and FE on the platform eventually. Filter set templates and partner onboarding can reference these types like IUL.

**Remaining when MP/FE go live:**
- Duplicate Active Prospect JSON nodes for Freedom Financial and Independent Financial flows pointing to `/api/leads/intake`
- Confirm SRC values match admin category criteria (or add criteria for new payload fields)

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

**Implementation status:** Captured as `boberdooLeadType` (`Lead_Type` in intake). Category assignment uses admin criteria (often `SRC`), not this numeric field directly.

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

## 8. Broader product types

**Status: implemented via `lead_categories` table** — not a fixed Prisma enum. New product lines are admin-created categories with custom criteria and Integrity labels (`integrity_label` Realtime, optional `integrity_label_storefront` with Realtime fallback). Internal `type` is snake_case generated from label at creation.

---

## Source References

- `docs/update_call_13-7` — July 13 client call transcript (minutes 3:03–13:55)
- `docs/BOBERDOO_EXPLORATION.md` — Sections 3, 4, 24, 25
- `src/lib/lead-categories/flexible-lead-categories.ts` — Category evaluation and admin schemas
- `src/lib/intake/process-intake.ts` — Intake orchestration
- `docs/LEADCONDUIT_SETUP.md` — Payload mapping and default SRC criteria
- `docs/BACKEND.md` — Admin APIs and schema
