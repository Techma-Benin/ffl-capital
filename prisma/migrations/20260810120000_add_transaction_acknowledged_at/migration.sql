-- Track when a partner has seen an in-app admin credit grant notification.
ALTER TABLE "transactions" ADD COLUMN "acknowledged_at" TIMESTAMP(3);

-- Existing admin grants were communicated by email; do not surface retroactively.
UPDATE "transactions"
SET "acknowledged_at" = "created_at"
WHERE "type" = 'admin_grant' AND "acknowledged_at" IS NULL;
