-- CreateEnum
CREATE TYPE "LeadEventType" AS ENUM (
  'received',
  'matched',
  'delivered',
  'delivery_failed',
  'refunded',
  'integrity_posted',
  'aged_purchased',
  'reprocessed',
  'duplicate_rejected',
  'trustedform_failed',
  'deleted'
);

-- CreateEnum
CREATE TYPE "CrmProvider" AS ENUM ('webhook', 'ringy', 'email_only');

-- CreateEnum
CREATE TYPE "FilterSetDeliveryChannel" AS ENUM ('email', 'webhook', 'ringy');

-- AlterEnum
ALTER TYPE "LeadStatus" ADD VALUE 'review';

-- AlterTable: partner delivery credentials
ALTER TABLE "partners"
  ADD COLUMN "crm_provider" "CrmProvider" NOT NULL DEFAULT 'email_only',
  ADD COLUMN "ringy_sid" TEXT,
  ADD COLUMN "ringy_auth_token" TEXT;

-- AlterTable: lead TrustedForm validation fields
ALTER TABLE "leads"
  ADD COLUMN "trustedform_valid" BOOLEAN,
  ADD COLUMN "trustedform_checked_at" TIMESTAMP(3);

-- AlterTable: lead delivery filter set + error tracking
ALTER TABLE "lead_deliveries"
  ADD COLUMN "filter_set_id" UUID,
  ADD COLUMN "last_delivery_error" TEXT;

-- CreateTable: partner filter sets
CREATE TABLE "partner_filter_sets" (
  "id" UUID NOT NULL,
  "partner_id" UUID NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'Default',
  "lead_type" "LeadType" NOT NULL,
  "filter_states" TEXT[],
  "priority" INTEGER NOT NULL DEFAULT 5,
  "price_override" DECIMAL(10,2),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "hourly_limit" INTEGER,
  "daily_limit" INTEGER,
  "delivery_channel" "FilterSetDeliveryChannel" NOT NULL DEFAULT 'email',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "partner_filter_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable: lead events audit log
CREATE TABLE "lead_events" (
  "id" UUID NOT NULL,
  "lead_id" UUID NOT NULL,
  "type" "LeadEventType" NOT NULL,
  "payload" JSONB,
  "actor_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "lead_events_pkey" PRIMARY KEY ("id")
);

-- Backfill: one active filter set per existing partner
INSERT INTO "partner_filter_sets" (
  "id",
  "partner_id",
  "name",
  "lead_type",
  "filter_states",
  "priority",
  "price_override",
  "active",
  "delivery_channel",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  "id",
  'Default',
  "lead_type",
  "filter_states",
  "priority",
  "price_override",
  true,
  CASE
    WHEN "crm_webhook_url" IS NOT NULL THEN 'webhook'::"FilterSetDeliveryChannel"
    ELSE 'email'::"FilterSetDeliveryChannel"
  END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "partners";

-- Backfill: set crm_provider from existing webhook URLs
UPDATE "partners"
SET "crm_provider" = 'webhook'::"CrmProvider"
WHERE "crm_webhook_url" IS NOT NULL;

-- CreateIndex
CREATE INDEX "leads_external_id_idx" ON "leads"("external_id");
CREATE INDEX "leads_email_phone_idx" ON "leads"("email", "phone");
CREATE INDEX "partner_filter_sets_partner_id_active_idx" ON "partner_filter_sets"("partner_id", "active");
CREATE INDEX "partner_filter_sets_lead_type_idx" ON "partner_filter_sets"("lead_type");
CREATE INDEX "lead_events_lead_id_created_at_idx" ON "lead_events"("lead_id", "created_at");
CREATE INDEX "lead_deliveries_filter_set_id_idx" ON "lead_deliveries"("filter_set_id");

-- AddForeignKey
ALTER TABLE "partner_filter_sets"
  ADD CONSTRAINT "partner_filter_sets_partner_id_fkey"
  FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lead_events"
  ADD CONSTRAINT "lead_events_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lead_deliveries"
  ADD CONSTRAINT "lead_deliveries_filter_set_id_fkey"
  FOREIGN KEY ("filter_set_id") REFERENCES "partner_filter_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
