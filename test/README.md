# Backend category tests

These tests define the contract for flexible lead categories without touching a database.

## Commands

- `pnpm test:backend:current` — current regression suite only; expected green.
- `pnpm test:backend:planned` — category resolution feature specs (presentation, diagnostics, manual assignment, import, reprocess guardrails); expected green.
- `pnpm test:backend` — both suites.

## Current suite (`test/current/`)

Protects LeadConduit/Boberdoo intake validation, contact and payload normalization, exact case-sensitive criterion matching via `evaluateLeadCategories`, and the absence of implicit Intent/SRC fallbacks when no category rules match.

## Planned suite (`test/planned/`)

Implemented specs (all green) covering:

| File | Module(s) | Behavior |
|------|-----------|----------|
| `flexible-lead-categories.spec.test.ts` | `flexible-lead-categories.ts` | Server-generated types, criterion validation, AND matching, one/zero/multiple outcomes, disabled categories |
| `lead-category-presentation.spec.test.ts` | `category-presentation.ts` | Display labels from category table; **Unclassified** and **Multiple match** |
| `category-payload-diagnostics.spec.test.ts` | `payload-diagnostics.ts` | Categorization-field diagnostics on raw payload |
| `manual-category-assignment.spec.test.ts` | `manual-category-assignment.ts` | Review-only assignment, payload sync, rejection rules |
| `import-category-classification.spec.test.ts` | `import-category-classification.ts` | Import uses category table, no legacy IUL fallback |
| `reprocess-category-guardrails.spec.test.ts` | `reprocess-eligibility.ts` | Blocks unresolved categories from cron reprocess |

No suite applies migrations or connects to the production database.
