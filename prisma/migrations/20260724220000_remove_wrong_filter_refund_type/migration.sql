-- Convert refund_type from enum to text, then drop the RefundType enum.
-- Historical records with 'wrong_filter' are preserved as plain text.

ALTER TABLE "refund_requests" ALTER COLUMN "refund_type" TYPE TEXT USING "refund_type"::TEXT;

DROP TYPE IF EXISTS "RefundType";
