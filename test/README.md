# Backend category tests

These tests define the contract for flexible lead categories without touching a database.

## Commands

- `pnpm test:backend:current` — current regression suite only; expected green.
- `pnpm test:backend:planned` — flexible category specification suite; expected green after implementation.
- `pnpm test:backend` — both suites.

The current suite protects LeadConduit/Boberdoo intake validation, contact and payload normalization, exact case-sensitive criterion matching via `evaluateLeadCategories`, and the absence of implicit Intent/SRC fallbacks when no category rules match.

The planned suite (`test/planned/flexible-lead-categories.spec.test.ts`) covers `src/lib/lead-categories/flexible-lead-categories.ts`: server-generated internal types, criterion validation, AND matching, one/zero/multiple outcomes, disabled categories, and downstream routing expectations.

No suite applies migrations or connects to the production database.
