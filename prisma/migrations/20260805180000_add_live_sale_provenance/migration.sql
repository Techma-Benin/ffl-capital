-- Additive live-sale provenance for one-automatic-live-sale routing policy.
ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "live_sold_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "live_sale_channel" TEXT;

CREATE INDEX IF NOT EXISTS "leads_live_sold_at_idx" ON "leads" ("live_sold_at");
