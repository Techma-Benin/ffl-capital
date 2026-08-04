# Work in progress (stashed features)

Features parked here until we're ready to ship them.

## Admin-configurable intake required fields

**Stashed:** 2026-08-04 (removed from `replit`; was commit `b6659d4`)

### Restore options

1. **Cherry-pick the branch**
   ```bash
   git cherry-pick wip/admin-intake-required-fields
   pnpm db:migrate
   ```

2. **Apply the patch**
   ```bash
   git apply .wip/patches/0001-Add-admin-configurable-intake-required-fields.patch
   pnpm db:migrate
   ```

3. **Merge the branch**
   ```bash
   git merge wip/admin-intake-required-fields
   pnpm db:migrate
   ```

Branch: `wip/admin-intake-required-fields` (points at `b6659d4`)
