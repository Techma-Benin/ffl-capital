-- Drop the matching_enabled column from lead_categories.
-- The `enabled` field now gates both intake and partner matching.
ALTER TABLE "lead_categories" DROP COLUMN IF EXISTS "matching_enabled";
