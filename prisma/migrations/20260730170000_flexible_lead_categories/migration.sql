-- Replace the single SRC mapping with normalized exact-match criteria.
CREATE TABLE "lead_category_criteria" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "category_id" UUID NOT NULL,
  "field" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "lead_category_criteria_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lead_category_criteria_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "lead_categories"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "lead_category_criteria_category_id_field_key"
  ON "lead_category_criteria"("category_id", "field");
CREATE INDEX "lead_category_criteria_category_id_idx"
  ON "lead_category_criteria"("category_id");

-- Preserve every configured SRC mapping as an exact, case-sensitive rule.
INSERT INTO "lead_category_criteria" ("category_id", "field", "value")
SELECT "id", 'SRC', "src"
FROM "lead_categories"
WHERE "src" IS NOT NULL;

ALTER TABLE "lead_categories" DROP COLUMN "src";

-- Persist category resolution independently from matching/delivery status.
CREATE TYPE "LeadCategoryResolution" AS ENUM (
  'matched',
  'no_match',
  'multiple_matches'
);

ALTER TABLE "leads"
  ALTER COLUMN "lead_type" DROP NOT NULL,
  ADD COLUMN "category_resolution" "LeadCategoryResolution" NOT NULL DEFAULT 'matched',
  ADD COLUMN "category_candidate_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Existing leads were accepted under the previous resolver and are therefore
-- treated as matched, retaining their known category as the sole candidate.
UPDATE "leads"
SET "category_candidate_types" = ARRAY["lead_type"]
WHERE "lead_type" IS NOT NULL;
