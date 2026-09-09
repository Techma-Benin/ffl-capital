-- Partner-only pause for lead categories (Integrity classification unchanged).
ALTER TABLE "lead_categories" ADD COLUMN "partner_enabled" BOOLEAN NOT NULL DEFAULT true;

-- Hold aged leads while a Stripe checkout is in progress.
ALTER TABLE "leads" ADD COLUMN "aged_hold_checkout_id" UUID;
ALTER TABLE "leads" ADD COLUMN "aged_hold_expires_at" TIMESTAMP(3);

CREATE TYPE "AgedCheckoutStatus" AS ENUM ('pending', 'paid', 'expired');

CREATE TABLE "aged_checkouts" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "stripe_checkout_session_id" TEXT,
    "lead_ids" TEXT[],
    "quoted_total" DECIMAL(10,2) NOT NULL,
    "status" "AgedCheckoutStatus" NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aged_checkouts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "aged_checkouts_stripe_checkout_session_id_key" ON "aged_checkouts"("stripe_checkout_session_id");
CREATE INDEX "aged_checkouts_partner_id_status_idx" ON "aged_checkouts"("partner_id", "status");
CREATE INDEX "leads_aged_hold_expires_at_idx" ON "leads"("aged_hold_expires_at");

ALTER TABLE "aged_checkouts" ADD CONSTRAINT "aged_checkouts_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_aged_hold_checkout_id_fkey" FOREIGN KEY ("aged_hold_checkout_id") REFERENCES "aged_checkouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
