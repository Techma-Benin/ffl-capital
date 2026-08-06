---
name: Enum-to-varchar migration — all dependent tables
description: When dropping a Postgres enum, every table using that enum column must be converted first, including tables added by later migrations.
---

When writing a migration that drops a Postgres enum (e.g. `DROP TYPE "LeadType"`), all columns that reference it across **all** tables must be `ALTER COLUMN … TYPE VARCHAR` first — including tables introduced by migrations that ran *after* the enum was created. Postgres will refuse to drop the enum with error code `2BP01` if any column still depends on it.

**Why:** Task agents work in isolated DB copies. A table added in a separate task (e.g. `filter_set_templates` from Task #10) may not exist yet in the task agent's DB when the enum-drop migration is written, so the author naturally omits it. On merge to main the table exists and the migration fails.

**How to apply:**
1. Before writing a `DROP TYPE` migration, query the live DB for all dependents:
   ```sql
   SELECT c.table_name, c.column_name
   FROM information_schema.columns c
   JOIN pg_type t ON t.typname = '<TypeName>'
   JOIN pg_attribute a ON a.atttypid = t.oid
   JOIN pg_class cl ON cl.oid = a.attrelid AND cl.relname = c.table_name AND a.attname = c.column_name
   WHERE c.table_schema = 'public';
   ```
2. Include an `ALTER COLUMN … TYPE VARCHAR USING …::TEXT` for every returned row before the `DROP TYPE`.
3. If a migration fails with `2BP01` on main, fix the SQL, delete the stuck row from `_prisma_migrations` (where `finished_at IS NULL`), then re-run `DIRECT_URL=$DATABASE_URL npx prisma migrate deploy`.
