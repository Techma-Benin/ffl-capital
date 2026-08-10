/** Fair routing queue knobs (env-overridable). */
export const ROUTING_QUEUE_DEFAULTS = {
  pageSize: 50,
  concurrency: 5,
  runtimeBudgetMs: 4 * 60 * 1000,
  claimLeaseMs: 2 * 60 * 1000,
  /** Backoff after partner miss / similar definitive partner failures (minutes). */
  partnerMissBackoffMinutes: [5, 15, 30] as const,
  /** NCA retry schedule inside the realtime window (minutes). */
  noCampaignBackoffMinutes: [15, 30, 60] as const,
  /** Operational Integrity failure backoff (minutes). */
  operationalBackoffMinutes: [5, 10, 20] as const,
} as const;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function getRoutingQueueConfig() {
  return {
    pageSize: envInt("ROUTING_QUEUE_PAGE_SIZE", ROUTING_QUEUE_DEFAULTS.pageSize),
    concurrency: envInt(
      "ROUTING_QUEUE_CONCURRENCY",
      ROUTING_QUEUE_DEFAULTS.concurrency,
    ),
    runtimeBudgetMs: envInt(
      "ROUTING_QUEUE_RUNTIME_BUDGET_MS",
      ROUTING_QUEUE_DEFAULTS.runtimeBudgetMs,
    ),
    claimLeaseMs: envInt(
      "ROUTING_QUEUE_CLAIM_LEASE_MS",
      ROUTING_QUEUE_DEFAULTS.claimLeaseMs,
    ),
    partnerMissBackoffMinutes: ROUTING_QUEUE_DEFAULTS.partnerMissBackoffMinutes,
    noCampaignBackoffMinutes: ROUTING_QUEUE_DEFAULTS.noCampaignBackoffMinutes,
    operationalBackoffMinutes: ROUTING_QUEUE_DEFAULTS.operationalBackoffMinutes,
  };
}
