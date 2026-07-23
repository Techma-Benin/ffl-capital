-- CreateEnum
CREATE TYPE "PartnerCrmOutboundAuthType" AS ENUM ('none', 'bearer', 'api_key_header', 'basic', 'body_fields');

-- CreateEnum
CREATE TYPE "PartnerCrmOutboundHttpMethod" AS ENUM ('POST');

-- CreateTable
CREATE TABLE "partner_crm_outbound_configs" (
    "partner_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "endpoint_url" TEXT NOT NULL,
    "http_method" "PartnerCrmOutboundHttpMethod" NOT NULL DEFAULT 'POST',
    "auth_type" "PartnerCrmOutboundAuthType" NOT NULL,
    "auth_config" JSONB NOT NULL DEFAULT '{}',
    "field_mappings" JSONB NOT NULL DEFAULT '[]',
    "success_rule" JSONB NOT NULL DEFAULT '{"require2xx": true}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_crm_outbound_configs_pkey" PRIMARY KEY ("partner_id")
);

-- AddForeignKey
ALTER TABLE "partner_crm_outbound_configs" ADD CONSTRAINT "partner_crm_outbound_configs_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop legacy partner CRM columns
ALTER TABLE "partners" DROP COLUMN IF EXISTS "crm_webhook_url",
DROP COLUMN IF EXISTS "crm_provider",
DROP COLUMN IF EXISTS "ringy_sid",
DROP COLUMN IF EXISTS "ringy_auth_token";

-- Drop filter set delivery channel
ALTER TABLE "partner_filter_sets" DROP COLUMN IF EXISTS "delivery_channel";

-- DropEnum
DROP TYPE IF EXISTS "FilterSetDeliveryChannel";

-- DropEnum
DROP TYPE IF EXISTS "CrmProvider";
