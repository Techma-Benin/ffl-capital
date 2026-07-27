-- #82 aged-lead purchasing rules: sale count + next availability window
ALTER TABLE "leads" ADD COLUMN "aged_sale_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "leads" ADD COLUMN "aged_available_after" TIMESTAMP(3);

CREATE INDEX "leads_aged_sale_count_aged_available_after_idx"
  ON "leads"("aged_sale_count", "aged_available_after");
