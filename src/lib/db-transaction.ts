/**
 * Shared options for Prisma interactive transactions.
 * Supabase pooler / slow networks often exceed Prisma defaults (maxWait 2s, timeout 5s),
 * which surfaces as P2028 "Transaction not found" / "Unable to start a transaction".
 */
export const PRISMA_TX_OPTIONS = {
  maxWait: 15_000,
  timeout: 30_000,
} as const;
