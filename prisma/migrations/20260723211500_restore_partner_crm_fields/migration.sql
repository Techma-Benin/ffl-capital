-- Restore partner CRM / delivery fields removed by orphaned
-- 20250723190000_partner_crm_outbound (present in DB history, missing from repo).

CREATE TYPE "CrmProvider" AS ENUM ('webhook', 'ringy', 'email_only');

CREATE TYPE "FilterSetDeliveryChannel" AS ENUM ('email', 'webhook', 'ringy');

ALTER TABLE "partners"
  ADD COLUMN IF NOT EXISTS "crm_provider" "CrmProvider" NOT NULL DEFAULT 'email_only',
  ADD COLUMN IF NOT EXISTS "crm_webhook_url" TEXT,
  ADD COLUMN IF NOT EXISTS "ringy_auth_token" TEXT,
  ADD COLUMN IF NOT EXISTS "ringy_sid" TEXT;

ALTER TABLE "partner_filter_sets"
  ADD COLUMN IF NOT EXISTS "delivery_channel" "FilterSetDeliveryChannel" NOT NULL DEFAULT 'email';

ALTER TABLE IF EXISTS "partner_crm_outbound_configs"
  DROP CONSTRAINT IF EXISTS "partner_crm_outbound_configs_partner_id_fkey";

DROP TABLE IF EXISTS "partner_crm_outbound_configs";

DROP TYPE IF EXISTS "PartnerCrmOutboundAuthType";
DROP TYPE IF EXISTS "PartnerCrmOutboundHttpMethod";
