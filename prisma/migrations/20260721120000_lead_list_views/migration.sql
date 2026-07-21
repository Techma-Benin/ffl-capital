-- CreateEnum
CREATE TYPE "LeadListViewScope" AS ENUM ('admin', 'partner');

-- CreateTable
CREATE TABLE "lead_list_views" (
    "id" UUID NOT NULL,
    "scope" "LeadListViewScope" NOT NULL,
    "partner_id" UUID,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "sort" JSONB NOT NULL,
    "columns" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_by_clerk_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_list_views_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "lead_list_views" ADD CONSTRAINT "lead_list_views_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "lead_list_views_scope_partner_id_idx" ON "lead_list_views"("scope", "partner_id");

-- Partial unique: admin view names (global)
CREATE UNIQUE INDEX "lead_list_views_admin_name_key" ON "lead_list_views" ("scope", "name") WHERE "partner_id" IS NULL AND "scope" = 'admin';

-- Partial unique: partner view names per partner
CREATE UNIQUE INDEX "lead_list_views_partner_name_key" ON "lead_list_views" ("partner_id", "name") WHERE "scope" = 'partner';

-- One default admin view
CREATE UNIQUE INDEX "lead_list_views_admin_default_key" ON "lead_list_views" ("scope") WHERE "is_default" = true AND "scope" = 'admin' AND "partner_id" IS NULL;

-- One default per partner
CREATE UNIQUE INDEX "lead_list_views_partner_default_key" ON "lead_list_views" ("partner_id") WHERE "is_default" = true AND "scope" = 'partner';

ALTER TABLE "lead_list_views" ENABLE ROW LEVEL SECURITY;

-- Admin seed views (replace status tabs)
INSERT INTO "lead_list_views" ("id", "scope", "partner_id", "name", "filters", "sort", "columns", "is_default", "updated_at")
VALUES
  (gen_random_uuid(), 'admin', NULL, 'All Leads', '{"statusSlice":"all"}'::jsonb, '{"field":"receivedAt","direction":"desc"}'::jsonb,
   '[{"key":"id","visible":true},{"key":"name","visible":true},{"key":"phone","visible":true},{"key":"state","visible":true},{"key":"type","visible":true},{"key":"status","visible":true},{"key":"partner","visible":true},{"key":"price","visible":true},{"key":"received","visible":true},{"key":"trustedform","visible":true},{"key":"actions","visible":true}]'::jsonb,
   true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'admin', NULL, 'Matched', '{"statusSlice":"matched"}'::jsonb, '{"field":"receivedAt","direction":"desc"}'::jsonb,
   '[{"key":"id","visible":true},{"key":"name","visible":true},{"key":"phone","visible":true},{"key":"state","visible":true},{"key":"type","visible":true},{"key":"status","visible":true},{"key":"partner","visible":true},{"key":"price","visible":true},{"key":"received","visible":true},{"key":"trustedform","visible":true},{"key":"actions","visible":true}]'::jsonb,
   false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'admin', NULL, 'Unmatched', '{"statusSlice":"unmatched"}'::jsonb, '{"field":"receivedAt","direction":"desc"}'::jsonb,
   '[{"key":"id","visible":true},{"key":"name","visible":true},{"key":"phone","visible":true},{"key":"state","visible":true},{"key":"type","visible":true},{"key":"status","visible":true},{"key":"partner","visible":true},{"key":"price","visible":true},{"key":"received","visible":true},{"key":"trustedform","visible":true},{"key":"actions","visible":true}]'::jsonb,
   false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'admin', NULL, 'Integrity', '{"statusSlice":"integrity_posted"}'::jsonb, '{"field":"receivedAt","direction":"desc"}'::jsonb,
   '[{"key":"id","visible":true},{"key":"name","visible":true},{"key":"phone","visible":true},{"key":"state","visible":true},{"key":"type","visible":true},{"key":"status","visible":true},{"key":"partner","visible":true},{"key":"price","visible":true},{"key":"received","visible":true},{"key":"trustedform","visible":true},{"key":"actions","visible":true}]'::jsonb,
   false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'admin', NULL, 'Aged Listed', '{"statusSlice":"aged_listed"}'::jsonb, '{"field":"receivedAt","direction":"desc"}'::jsonb,
   '[{"key":"id","visible":true},{"key":"name","visible":true},{"key":"phone","visible":true},{"key":"state","visible":true},{"key":"type","visible":true},{"key":"status","visible":true},{"key":"partner","visible":true},{"key":"price","visible":true},{"key":"received","visible":true},{"key":"trustedform","visible":true},{"key":"actions","visible":true}]'::jsonb,
   false, CURRENT_TIMESTAMP);

-- Partner default view per existing partner
INSERT INTO "lead_list_views" ("id", "scope", "partner_id", "name", "filters", "sort", "columns", "is_default", "updated_at")
SELECT
  gen_random_uuid(),
  'partner'::"LeadListViewScope",
  p.id,
  'All deliveries',
  '{}'::jsonb,
  '{"field":"deliveredAt","direction":"desc"}'::jsonb,
  '[{"key":"select","visible":true},{"key":"name","visible":true},{"key":"contact","visible":true},{"key":"location","visible":true},{"key":"type","visible":true},{"key":"channel","visible":true},{"key":"price","visible":true},{"key":"status","visible":true},{"key":"delivered","visible":true},{"key":"actions","visible":true}]'::jsonb,
  true,
  CURRENT_TIMESTAMP
FROM "partners" p;
