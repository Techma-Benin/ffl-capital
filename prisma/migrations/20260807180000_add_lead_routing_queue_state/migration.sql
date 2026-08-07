-- Fair routing queue + Integrity permanent-block + cross-instance claim lease
ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "last_routing_attempt_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "next_routing_attempt_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "routing_attempt_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "integrity_blocked_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "integrity_blocked_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "routing_claimed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "routing_claimed_by" TEXT,
  ADD COLUMN IF NOT EXISTS "routing_claim_expires_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "leads_status_available_next_routing_attempt_at_idx"
  ON "leads"("status", "available", "next_routing_attempt_at");

CREATE INDEX IF NOT EXISTS "leads_status_available_received_at_idx"
  ON "leads"("status", "available", "received_at");

CREATE INDEX IF NOT EXISTS "leads_routing_claim_expires_at_idx"
  ON "leads"("routing_claim_expires_at");

CREATE INDEX IF NOT EXISTS "resale_postings_lead_id_idx"
  ON "resale_postings"("lead_id");

-- Existing unmatched eligible leads are immediately due
UPDATE "leads"
SET "next_routing_attempt_at" = NOW()
WHERE "status" = 'unmatched'
  AND "available" = true
  AND "category_resolution" = 'matched'
  AND "lead_type" IS NOT NULL
  AND "next_routing_attempt_at" IS NULL;

-- Derive Integrity permanent block only from unambiguous terminal rejections
UPDATE "leads" AS l
SET
  "integrity_blocked_at" = e."created_at",
  "integrity_blocked_reason" = COALESCE(
    NULLIF(e."payload"->>'reason', ''),
    'Terminal Integrity rejection'
  )
FROM (
  SELECT DISTINCT ON ("lead_id")
    "lead_id",
    "created_at",
    "payload"
  FROM "lead_events"
  WHERE "type" = 'integrity_rejected'
  ORDER BY "lead_id", "created_at" DESC
) AS e
WHERE l."id" = e."lead_id"
  AND l."integrity_blocked_at" IS NULL;
