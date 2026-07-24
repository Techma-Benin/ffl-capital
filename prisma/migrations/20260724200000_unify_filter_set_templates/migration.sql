-- AlterTable: templates live on partner_filter_sets (is_template + nullable partner_id)
ALTER TABLE "partner_filter_sets" ADD COLUMN "is_template" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "partner_filter_sets" ADD COLUMN "description" TEXT;
ALTER TABLE "partner_filter_sets" ALTER COLUMN "partner_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "partner_filter_sets_is_template_idx" ON "partner_filter_sets"("is_template");

-- Backfill catalog rows from filter_set_templates
INSERT INTO "partner_filter_sets" (
  "id",
  "partner_id",
  "name",
  "description",
  "lead_type",
  "filter_states",
  "priority",
  "price_override",
  "active",
  "is_template",
  "weekly_limit",
  "monthly_limit",
  "filter_criteria",
  "created_at",
  "updated_at"
)
SELECT
  "id",
  NULL,
  "name",
  "description",
  "lead_type",
  "filter_states",
  5,
  NULL,
  true,
  true,
  NULL,
  NULL,
  '{}'::jsonb,
  "created_at",
  "updated_at"
FROM "filter_set_templates";

-- DropTable
DROP TABLE "filter_set_templates";
