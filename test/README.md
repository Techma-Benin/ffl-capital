# Backend category tests

These tests define the contract for flexible lead categories without touching a database.

## Commands

- `pnpm test:backend:current` — current regression suite only; expected green.
- `pnpm test:backend:planned` — current flexible-category tests plus the next feature specification; expected red until the lead-category resolution feature is implemented.
- `pnpm test:backend` — both suites.

The current suite protects LeadConduit/Boberdoo intake validation, contact and payload normalization, exact case-sensitive criterion matching via `evaluateLeadCategories`, and the absence of implicit Intent/SRC fallbacks when no category rules match.

The existing flexible-category specification (`test/planned/flexible-lead-categories.spec.test.ts`) covers `src/lib/lead-categories/flexible-lead-categories.ts`: server-generated internal types, criterion validation, AND matching, one/zero/multiple outcomes, disabled categories, and downstream routing expectations.

The remaining planned specifications are intentionally red before implementation. They define:

- category-table display labels plus `Unclassified` and `Multiple match`;
- categorization-field diagnostics for the raw payload;
- review-only manual category assignment and intake-field synchronization;
- category-table classification for imports and historical repair;
- reprocess eligibility after manual resolution.

No suite applies migrations or connects to the production database.
