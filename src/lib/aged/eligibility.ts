import { LeadStatus, Prisma } from "@prisma/client";
import { getAgedDaysThreshold } from "@/lib/settings/app-settings";
import {
  DEFAULT_AGED_PRICE_TIERS,
  getNextAgedBracketStartFromTiers,
  type AgedPriceTier,
} from "@/lib/aged/price-tiers";

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
 * Given a lead's receivedAt and price tiers, returns when the lead enters the
 * next age band (receivedAt + next tier minDays). Last open-ended band → null.
 */
export function getNextAgedBracketStart(
  receivedAt: Date,
  tiers: AgedPriceTier[] = DEFAULT_AGED_PRICE_TIERS,
): Date | null {
  return getNextAgedBracketStartFromTiers(receivedAt, tiers);
}

/**
 * A sentinel far-future date used to permanently retire a lead from the aged
 * marketplace once it has reached the maximum sale count.
 */
export const AGED_RETIRED_SENTINEL = new Date("2999-01-01T00:00:00.000Z");

export function buildAgedLeadWhereWithCutoff(
  cutoff: Date,
  extra?: Prisma.LeadWhereInput,
  options?: { heldByCheckoutId?: string },
): Prisma.LeadWhereInput {
  const now = new Date();
  const holdOr: Prisma.LeadWhereInput[] = [
    { agedHoldExpiresAt: null },
    { agedHoldExpiresAt: { lte: now } },
  ];
  if (options?.heldByCheckoutId) {
    holdOr.push({ agedHoldCheckoutId: options.heldByCheckoutId });
  }
  return {
    AND: [
      {
        receivedAt: { lte: cutoff },
        status: { not: LeadStatus.dead },
        agedSaleCount: { lt: 2 },
        OR: [
          { agedAvailableAfter: null },
          { agedAvailableAfter: { lte: now } },
        ],
      },
      { OR: holdOr },
      extra ?? {},
    ],
  };
}

export async function buildAgedLeadWhere(
  extra?: Prisma.LeadWhereInput,
  options?: { heldByCheckoutId?: string },
): Promise<Prisma.LeadWhereInput> {
  const cutoff = await getAgedCutoffDate();
  return buildAgedLeadWhereWithCutoff(cutoff, extra, options);
}
