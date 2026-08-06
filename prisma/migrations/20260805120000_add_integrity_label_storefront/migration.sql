-- Add nullable Storefront Integrity label; existing integrity_label remains the Realtime label.
ALTER TABLE "lead_categories"
  ADD COLUMN "integrity_label_storefront" TEXT;
