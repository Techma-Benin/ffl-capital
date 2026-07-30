# Backend category tests

These tests define the red/green boundary for flexible lead categories without
implementing the feature or touching a database.

## Commands

- `pnpm test:backend:current` — current regression suite only; expected green.
- `pnpm test:backend:planned` — future feature specification only; expected red
  until flexible category support is implemented.
- `pnpm test:backend` — both suites; expected red while planned tests remain.

The current suite protects LeadConduit/Boberdoo intake validation, contact and
payload normalization, exact case-sensitive SRC lookup, and existing fallback
categorization.

The planned suite intentionally expects
`src/lib/lead-categories/flexible-lead-categories.ts`. Until that module exists,
each planned test fails with a clear “Flexible lead categories are not
implemented” assertion instead of an import/discovery crash. Its contract
covers server-generated internal types, criterion validation, AND matching,
case-sensitive top-level payload matching, one/zero/multiple outcomes, disabled
categories, migrated SRC criterion rows, and downstream routing guardrails.

No suite applies migrations or connects to the production database.
