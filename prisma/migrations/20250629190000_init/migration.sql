-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "LeadType" AS ENUM ('traditional_iul', 'high_intent_iul');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('pending_approval', 'active', 'rejected', 'disabled');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('unmatched', 'delivered', 'integrity_posted', 'aged_listed', 'dead');

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('realtime', 'aged');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('top_up', 'lead_purchase', 'aged_purchase', 'refund', 'reprocessing_fee');

-- CreateEnum
CREATE TYPE "RefundType" AS ENUM ('wrong_filter', 'invalid_phone');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ResaleMode" AS ENUM ('realtime', 'storefront');

-- CreateEnum
CREATE TYPE "ResaleStatus" AS ENUM ('pending', 'sold', 'rejected', 'reconciled');

-- CreateEnum
CREATE TYPE "MigrationJobStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('weekly');

-- CreateTable
CREATE TABLE "partners" (
    "id" UUID NOT NULL,
    "clerk_user_id" TEXT,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "affiliation" TEXT,
    "residence_state" TEXT NOT NULL,
    "lead_type" "LeadType" NOT NULL,
    "filter_states" TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 5,
    "price_override" DECIMAL(10,2),
    "wallet_balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "PartnerStatus" NOT NULL DEFAULT 'pending_approval',
    "crm_webhook_url" TEXT,
    "stripe_customer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "lead_type" "LeadType" NOT NULL,
    "trustedform_cert_url" TEXT,
    "source" TEXT NOT NULL DEFAULT 'meta_leadconduit',
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "refundable" BOOLEAN NOT NULL DEFAULT true,
    "status" "LeadStatus" NOT NULL DEFAULT 'unmatched',
    "external_id" TEXT,
    "raw_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_deliveries" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "delivered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refunded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" UUID NOT NULL,
    "lead_delivery_id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "reason" TEXT,
    "refund_type" "RefundType" NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balance_after" DECIMAL(10,2) NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "lead_delivery_id" UUID,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_recurrence" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "stripe_subscription_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "next_charge_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_recurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resale_postings" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "mode" "ResaleMode" NOT NULL,
    "status" "ResaleStatus" NOT NULL DEFAULT 'pending',
    "external_ref" TEXT,
    "posted_at" TIMESTAMP(3),
    "sold_at" TIMESTAMP(3),
    "revenue_share" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resale_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "migration_jobs" (
    "id" UUID NOT NULL,
    "status" "MigrationJobStatus" NOT NULL DEFAULT 'pending',
    "file_name" TEXT NOT NULL,
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "success_rows" INTEGER NOT NULL DEFAULT 0,
    "error_rows" INTEGER NOT NULL DEFAULT 0,
    "error_log" JSONB,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "migration_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partners_clerk_user_id_key" ON "partners"("clerk_user_id");

-- CreateIndex
CREATE INDEX "partners_status_idx" ON "partners"("status");

-- CreateIndex
CREATE INDEX "partners_priority_idx" ON "partners"("priority");

-- CreateIndex
CREATE INDEX "leads_state_status_available_idx" ON "leads"("state", "status", "available");

-- CreateIndex
CREATE INDEX "leads_received_at_idx" ON "leads"("received_at");

-- CreateIndex
CREATE INDEX "leads_available_received_at_idx" ON "leads"("available", "received_at");

-- CreateIndex
CREATE INDEX "lead_deliveries_partner_id_idx" ON "lead_deliveries"("partner_id");

-- CreateIndex
CREATE INDEX "lead_deliveries_lead_id_idx" ON "lead_deliveries"("lead_id");

-- CreateIndex
CREATE INDEX "lead_deliveries_refunded_at_idx" ON "lead_deliveries"("refunded_at");

-- CreateIndex
CREATE INDEX "transactions_partner_id_idx" ON "transactions"("partner_id");

-- AddForeignKey
ALTER TABLE "lead_deliveries" ADD CONSTRAINT "lead_deliveries_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_deliveries" ADD CONSTRAINT "lead_deliveries_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_lead_delivery_id_fkey" FOREIGN KEY ("lead_delivery_id") REFERENCES "lead_deliveries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_lead_delivery_id_fkey" FOREIGN KEY ("lead_delivery_id") REFERENCES "lead_deliveries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_recurrence" ADD CONSTRAINT "billing_recurrence_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resale_postings" ADD CONSTRAINT "resale_postings_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "migration_jobs" ADD CONSTRAINT "migration_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

