-- Partner can mark an aged lead delivery as sold within 7 days of purchase.
ALTER TABLE "lead_deliveries" ADD COLUMN "partner_sold_at" TIMESTAMP(3);

-- Audit trail for partner-marked aged sales.
ALTER TYPE "LeadEventType" ADD VALUE IF NOT EXISTS 'aged_partner_sold';
