-- Stripe webhook idempotency + unique payment intent on ledger credits.
-- Clears duplicate PI ids on older double-credits (keeps earliest row) so the
-- unique index can apply without failing migrate deploy. Does not reverse
-- historical wallet balances.

UPDATE "transactions" AS t
SET "stripe_payment_intent_id" = NULL
WHERE t."id" IN (
  SELECT "id"
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "stripe_payment_intent_id"
        ORDER BY "created_at" ASC
      ) AS rn
    FROM "transactions"
    WHERE "stripe_payment_intent_id" IS NOT NULL
  ) ranked
  WHERE ranked.rn > 1
);

CREATE TABLE "processed_stripe_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_stripe_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "transactions_stripe_payment_intent_id_key"
ON "transactions"("stripe_payment_intent_id");
