-- AlterTable
ALTER TABLE "partner_filter_sets" DROP COLUMN IF EXISTS "hourly_limit",
DROP COLUMN IF EXISTS "daily_limit",
ADD COLUMN IF NOT EXISTS "weekly_limit" INTEGER,
ADD COLUMN IF NOT EXISTS "monthly_limit" INTEGER,
ADD COLUMN IF NOT EXISTS "filter_criteria" JSONB NOT NULL DEFAULT '{}';
