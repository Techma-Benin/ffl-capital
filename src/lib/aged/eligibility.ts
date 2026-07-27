import { LeadStatus, Prisma } from "@prisma/client";
import { getAgedDaysThreshold } from "@/lib/settings/app-settings";

/** Age-bracket day thresholds (must match admin/partner marketplace buckets). */
export const AGED_BRACKET_DAYS = [30, 60, 90] as const;

/** Far-future sentinel: lead is permanently retired from the aged marketplace. */
export const AGED_RETIRED_SENTINEL = new Date("9999-12-31T00:00:00.000Z");

/** Max times a lead may be sold on the aged marketplace. */
export const MAX_AGED_SALES = 2;

export type AgedLeadAvailability = {
  agedSaleCount: number;
  agedAvailableAfter: Date | null | undefined;
};

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
 * Returns the DateTime when the lead enters the *next* age bracket after its
 * current age (based on receivedAt vs `now`).
 * - 30–60 days old → receivedAt + 60d
 * - 60–90 days old → receivedAt + 90d
 * - 90+ days old   → null (no next bracket)
 * - under 30 days  → receivedAt + 30d (not aged yet; defensive)
 */
export function getNextAgedBracketAvailableAfter(
  receivedAt: Date,
  now: Date = new Date(),
  thresholds: readonly number[] = AGED_BRACKET_DAYS,
): Date | null {
  const ageMs = now.getTime() - receivedAt.getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

  for (let i = 0; i < thresholds.length; i++) {
    const lower = thresholds[i];
    const upper = thresholds[i + 1];
    if (upper === undefined) {
      if (ageDays >= lower) return null;
      break;
    }
    if (ageDays >= lower && ageDays < upper) {
      const next = new Date(receivedAt.getTime());
      next.setUTCDate(next.getUTCDate() + upper);
      return next;
    }
  }

  if (ageDays < thresholds[0]) {
    const next = new Date(receivedAt.getTime());
    next.setUTCDate(next.getUTCDate() + thresholds[0]);
    return next;
  }

  return null;
}

/** Eligibility gate used by marketplace + admin aged list. */
export function isAgedMarketplaceEligible(
  lead: AgedLeadAvailability,
  now: Date = new Date(),
): boolean {
  if (lead.agedSaleCount >= MAX_AGED_SALES) return false;
  if (lead.agedAvailableAfter == null) return true;
  return lead.agedAvailableAfter.getTime() <= now.getTime();
}

/**
 * Prisma where fragment for the #82 gate.
 * AND this into aged list / purchase queries.
 */
export function agedMarketplaceEligibilityWhere(
  now: Date = new Date(),
): Prisma.LeadWhereInput {
  return {
    agedSaleCount: { lt: MAX_AGED_SALES },
    OR: [
      { agedAvailableAfter: null },
      { agedAvailableAfter: { lte: now } },
    ],
  };
}

/**
 * Side-effects after a successful aged purchase (pure; mirrors purchase tx update).
 */
export function computeAgedSaleUpdate(
  lead: { receivedAt: Date; agedSaleCount: number },
  now: Date = new Date(),
): { agedSaleCount: number; agedAvailableAfter: Date } {
  const agedSaleCount = lead.agedSaleCount + 1;

  if (agedSaleCount >= MAX_AGED_SALES) {
    return { agedSaleCount, agedAvailableAfter: AGED_RETIRED_SENTINEL };
  }

  const next = getNextAgedBracketAvailableAfter(lead.receivedAt, now);
  return {
    agedSaleCount,
    agedAvailableAfter: next ?? AGED_RETIRED_SENTINEL,
  };
}

export function buildAgedLeadWhereWithCutoff(
  cutoff: Date,
  extra?: Prisma.LeadWhereInput,
  now: Date = new Date(),
): Prisma.LeadWhereInput {
  return {
    AND: [
      {
        receivedAt: { lte: cutoff },
        status: { not: LeadStatus.dead },
        ...agedMarketplaceEligibilityWhere(now),
      },
      ...(extra ? [extra] : []),
    ],
  };
}

export async function buildAgedLeadWhere(
  extra?: Prisma.LeadWhereInput,
): Promise<Prisma.LeadWhereInput> {
  const cutoff = await getAgedCutoffDate();
  return buildAgedLeadWhereWithCutoff(cutoff, extra);
}
