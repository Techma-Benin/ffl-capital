-- Migration: introduce lead_categories table and convert leadType columns from
-- enum to varchar. The existing enum values are valid varchar strings so no data
-- transformation is required — only the column type changes.

-- 1. Create lead_categories table
CREATE TABLE "lead_categories" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "type"             VARCHAR      NOT NULL,
  "src"              VARCHAR,
  "label"            VARCHAR      NOT NULL,
  "default_price"    DECIMAL(10,2),
  "enabled"          BOOLEAN      NOT NULL DEFAULT true,
  "matching_enabled" BOOLEAN      NOT NULL DEFAULT true,
  "integrity_label"  VARCHAR,
  "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "lead_categories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lead_categories_type_key" UNIQUE ("type")
);

-- 2. Seed with the four existing lead types
INSERT INTO "lead_categories" ("type", "src", "label", "integrity_label") VALUES
  ('traditional_iul',   'IUL_LeadConduit',           'Traditional IUL',    'Indexed Universal Life [IUL] Facebook (Realtime Lead)'),
  ('high_intent_iul',   'IUL_LeadConduit_HighIntent', 'High Intent IUL',    'Indexed Universal Life [IUL] Facebook (Realtime Lead)'),
  ('mortgage_protection','Mortgage_LeadConduit',       'Mortgage Protection','Mortgage Protection Facebook (Realtime Lead)'),
  ('final_expense',     'Veteran_LeadConduit',         'Final Expense',      'Final Expense Facebook (Realtime Lead)');

-- 3. Convert leads.lead_type from enum to varchar
ALTER TABLE "leads"
  ALTER COLUMN "lead_type" TYPE VARCHAR USING "lead_type"::TEXT;

-- 4. Convert partner_filter_sets.lead_type from enum to varchar
ALTER TABLE "partner_filter_sets"
  ALTER COLUMN "lead_type" TYPE VARCHAR USING "lead_type"::TEXT;

-- 5. Convert partners.lead_type from enum to varchar
ALTER TABLE "partners"
  ALTER COLUMN "lead_type" TYPE VARCHAR USING "lead_type"::TEXT;

-- 5a. Convert filter_set_templates.lead_type from enum to varchar
--     (this table was added after the enum and also depends on it)
ALTER TABLE "filter_set_templates"
  ALTER COLUMN "lead_type" TYPE VARCHAR USING "lead_type"::TEXT;

-- 6. Drop the old LeadType enum (Prisma names it with quotes)
DROP TYPE IF EXISTS "LeadType";
