-- Lead type is per partner_filter_sets, not partners.
ALTER TABLE "partners" DROP COLUMN IF EXISTS "lead_type";
