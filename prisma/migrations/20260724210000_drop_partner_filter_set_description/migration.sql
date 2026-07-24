-- Drop optional description from unified partner_filter_sets / templates
ALTER TABLE "partner_filter_sets" DROP COLUMN IF EXISTS "description";
