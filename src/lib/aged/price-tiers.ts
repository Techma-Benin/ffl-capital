/**
 * Aged-lead price tiers: admin-editable age bands that drive marketplace
 * pricing and post-sale cooldown (next bracket start).
 */

export type AgedPriceTier = {
  minDays: number;
  /** Inclusive upper bound; null = open-ended (last band). */
  maxDays: number | null;
  price: number;
};

export const DEFAULT_AGED_PRICE_TIERS: AgedPriceTier[] = [
  { minDays: 30, maxDays: 60, price: 5 },
  { minDays: 61, maxDays: 90, price: 4 },
  { minDays: 91, maxDays: 180, price: 3 },
  { minDays: 181, maxDays: 365, price: 2 },
  { minDays: 366, maxDays: null, price: 1 },
];

export function sortAgedPriceTiers(
  tiers: AgedPriceTier[],
): AgedPriceTier[] {
  return [...tiers].sort((a, b) => a.minDays - b.minDays);
}

export function getAgedMarketplaceMinDays(
  tiers: AgedPriceTier[],
): number {
  const sorted = sortAgedPriceTiers(tiers);
  return sorted[0]?.minDays ?? 30;
}

export function ageDaysFromReceivedAt(
  receivedAt: Date,
  now = Date.now(),
): number {
  return (now - receivedAt.getTime()) / (1000 * 60 * 60 * 24);
}

export function findAgedPriceTier(
  ageDays: number,
  tiers: AgedPriceTier[],
): AgedPriceTier | null {
  for (const tier of sortAgedPriceTiers(tiers)) {
    if (ageDays < tier.minDays) continue;
    if (tier.maxDays == null || ageDays <= tier.maxDays) return tier;
  }
  return null;
}

export function resolveAgedPriceForAgeDays(
  ageDays: number,
  tiers: AgedPriceTier[],
  fallbackPrice: number,
): number {
  return findAgedPriceTier(ageDays, tiers)?.price ?? fallbackPrice;
}

export function resolveAgedPriceForReceivedAt(
  receivedAt: Date,
  tiers: AgedPriceTier[],
  fallbackPrice: number,
  now = Date.now(),
): number {
  return resolveAgedPriceForAgeDays(
    ageDaysFromReceivedAt(receivedAt, now),
    tiers,
    fallbackPrice,
  );
}

/**
 * After a first aged sale, when the lead may reappear: the start of the next
 * tier (receivedAt + next.minDays). Last open-ended tier → null (retire).
 */
export function getNextAgedBracketStartFromTiers(
  receivedAt: Date,
  tiers: AgedPriceTier[],
  now = Date.now(),
): Date | null {
  const sorted = sortAgedPriceTiers(tiers);
  if (sorted.length === 0) return null;

  const ageDays = ageDaysFromReceivedAt(receivedAt, now);
  for (let i = 0; i < sorted.length; i++) {
    const tier = sorted[i];
    const inTier =
      ageDays >= tier.minDays &&
      (tier.maxDays == null || ageDays <= tier.maxDays);
    if (!inTier) continue;

    const next = sorted[i + 1];
    if (!next) return null;

    const nextStart = new Date(receivedAt.getTime());
    nextStart.setDate(nextStart.getDate() + next.minDays);
    return nextStart;
  }
  return null;
}

export type AgedPriceTiersValidation =
  | { ok: true; tiers: AgedPriceTier[] }
  | { ok: false; error: string };

export function validateAgedPriceTiers(
  raw: unknown,
): AgedPriceTiersValidation {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: "At least one aged price tier is required" };
  }

  const tiers: AgedPriceTier[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      return { ok: false, error: "Each tier must be an object" };
    }
    const row = item as Record<string, unknown>;
    const minDays = Number(row.minDays);
    const price = Number(row.price);
    const maxRaw = row.maxDays;
    const maxDays =
      maxRaw === null || maxRaw === undefined || maxRaw === ""
        ? null
        : Number(maxRaw);

    if (!Number.isFinite(minDays) || !Number.isInteger(minDays) || minDays < 1) {
      return { ok: false, error: "minDays must be an integer >= 1" };
    }
    if (
      maxDays !== null &&
      (!Number.isFinite(maxDays) || !Number.isInteger(maxDays) || maxDays < minDays)
    ) {
      return {
        ok: false,
        error: "maxDays must be null or an integer >= minDays",
      };
    }
    if (!Number.isFinite(price) || price <= 0) {
      return { ok: false, error: "price must be a positive number" };
    }
    tiers.push({ minDays, maxDays, price });
  }

  const sorted = sortAgedPriceTiers(tiers);
  for (let i = 0; i < sorted.length; i++) {
    const tier = sorted[i];
    const next = sorted[i + 1];
    if (i < sorted.length - 1 && tier.maxDays == null) {
      return {
        ok: false,
        error: "Only the last tier may have an open-ended maxDays",
      };
    }
    if (next) {
      if (tier.maxDays == null) {
        return {
          ok: false,
          error: "Only the last tier may have an open-ended maxDays",
        };
      }
      if (next.minDays <= tier.maxDays) {
        return {
          ok: false,
          error: `Tiers overlap: ${tier.minDays}–${tier.maxDays} and ${next.minDays}+`,
        };
      }
    }
  }

  return { ok: true, tiers: sorted };
}

export function parseAgedPriceTiers(raw: unknown): AgedPriceTier[] {
  const result = validateAgedPriceTiers(raw);
  if (result.ok) return result.tiers;
  return DEFAULT_AGED_PRICE_TIERS;
}

export function formatAgedTierLabel(tier: AgedPriceTier): string {
  if (tier.maxDays == null) return `${tier.minDays}+ days`;
  return `${tier.minDays}–${tier.maxDays} days`;
}

export function buildAgedAgeFilterOptions(
  tiers: AgedPriceTier[],
): Array<{ value: string; label: string }> {
  return [
    { value: "all", label: "All" },
    ...sortAgedPriceTiers(tiers).map((tier) => ({
      value: String(tier.minDays),
      label: formatAgedTierLabel(tier),
    })),
  ];
}

/** Prisma receivedAt filter for a tier (ageDays in [minDays, maxDays]). */
export function resolveAgedTierReceivedAtFilter(
  tier: AgedPriceTier,
): { lte: Date; gte?: Date } {
  const maxCutoff = new Date();
  maxCutoff.setDate(maxCutoff.getDate() - tier.minDays);

  if (tier.maxDays == null) {
    return { lte: maxCutoff };
  }

  const minCutoff = new Date();
  minCutoff.setDate(minCutoff.getDate() - tier.maxDays);
  return { lte: maxCutoff, gte: minCutoff };
}

export function partnerAgedLeadMatchesTier(
  receivedAt: Date | string,
  tier: AgedPriceTier,
): boolean {
  const ageDays = Math.floor(
    (Date.now() - new Date(receivedAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (ageDays < tier.minDays) return false;
  if (tier.maxDays == null) return true;
  return ageDays <= tier.maxDays;
}
