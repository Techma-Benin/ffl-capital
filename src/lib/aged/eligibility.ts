import { LeadStatus, Prisma } from "@prisma/client";
import { getAgedDaysThreshold } from "@/lib/settings/app-settings";

export async function getAgedCutoffDate(): Promise<Date> {
  const days = await getAgedDaysThreshold();
  return getAgedCutoffDateSync(days);
}

export function getAgedCutoffDateSync(days = 30): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}

/**
 * Given a lead's receivedAt and the standard day thresholds [30, 60, 90],
 * returns the DateTime at which the lead enters the NEXT age bracket.
 *
 * - If the lead is currently 30–60 days old → next bracket starts at receivedAt + 60 days
 * - If the lead is currently 60–90 days old → next bracket starts at receivedAt + 90 days
 * - If the lead is 90+ days old             → no next bracket; returns null
 */
export function getNextAgedBracketStart(
  receivedAt: Date,
  thresholds = [30, 60, 90],
): Date | null {
  const ageDays =
    (Date.now() - receivedAt.getTime()) / (1000 * 60 * 60 * 24);

  // Find which bracket the lead currently sits in
  const sorted = [...thresholds].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    const lower = sorted[i];
    const upper = sorted[i + 1] ?? Infinity;
    if (ageDays >= lower && ageDays < upper) {
      if (upper === Infinity) {
        // Already in the last bracket; no next bracket
        return null;
      }
      // Next bracket starts when age reaches `upper`
      const next = new Date(receivedAt.getTime());
      next.setDate(next.getDate() + upper);
      return next;
    }
  }
  return null;
}

/**
 * A sentinel far-future date used to permanently retire a lead from the aged
 * marketplace once it has reached the maximum sale count.
 */
export const AGED_RETIRED_SENTINEL = new Date("2999-01-01T00:00:00.000Z");

export function buildAgedLeadWhereWithCutoff(
  cutoff: Date,
  extra?: Prisma.LeadWhereInput,
): Prisma.LeadWhereInput {
  return {
    receivedAt: { lte: cutoff },
    status: { not: LeadStatus.dead },
    agedSaleCount: { lt: 2 },
    OR: [
      { agedAvailableAfter: null },
      { agedAvailableAfter: { lte: new Date() } },
    ],
    ...extra,
  };
}

export async function buildAgedLeadWhere(
  extra?: Prisma.LeadWhereInput,
): Promise<Prisma.LeadWhereInput> {
  const cutoff = await getAgedCutoffDate();
  return buildAgedLeadWhereWithCutoff(cutoff, extra);
}
