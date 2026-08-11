-- Remove unused LeadStatus.aged_listed (never set by app runtime; age eligibility is query-based).

-- Remap any existing rows before dropping the enum value.
UPDATE "leads"
SET "status" = 'unmatched'
WHERE "status" = 'aged_listed';

-- Drop admin list views that filtered by the removed statusSlice.
DELETE FROM "lead_list_views"
WHERE "filters"->>'statusSlice' = 'aged_listed';

-- Recreate LeadStatus without aged_listed (Postgres cannot DROP ENUM value in-place).
ALTER TYPE "LeadStatus" RENAME TO "LeadStatus_old";

CREATE TYPE "LeadStatus" AS ENUM (
  'unmatched',
  'delivered',
  'integrity_posted',
  'dead',
  'review'
);

ALTER TABLE "leads" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "leads"
  ALTER COLUMN "status" TYPE "LeadStatus"
  USING ("status"::text::"LeadStatus");

ALTER TABLE "leads" ALTER COLUMN "status" SET DEFAULT 'unmatched'::"LeadStatus";

DROP TYPE "LeadStatus_old";
