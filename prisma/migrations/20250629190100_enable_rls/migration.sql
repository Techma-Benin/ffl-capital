-- GIN index for partner filter_states array matching (PRD §8)
CREATE INDEX IF NOT EXISTS "partners_filter_states_gin_idx" ON "partners" USING GIN ("filter_states");

-- Enable Row Level Security on all public tables.
-- No policies for anon/authenticated: access is server-side via Prisma only.
ALTER TABLE "partners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lead_deliveries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refund_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "billing_recurrence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "resale_postings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "migration_jobs" ENABLE ROW LEVEL SECURITY;
