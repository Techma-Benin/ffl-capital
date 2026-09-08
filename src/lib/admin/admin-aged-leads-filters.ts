import { LeadStatus, Prisma } from "@prisma/client";
import { buildAgedLeadWhereWithCutoff, getAgedCutoffDate } from "@/lib/aged/eligibility";
import {
  DEFAULT_AGED_PRICE_TIERS,
  buildAgedAgeFilterOptions,
  partnerAgedLeadMatchesTier,
  resolveAgedTierReceivedAtFilter,
  type AgedPriceTier,
} from "@/lib/aged/price-tiers";
import { getAgedPriceTiers } from "@/lib/settings/app-settings";

export const ADMIN_AGED_STATE_PARAM = "state";
export const ADMIN_AGED_TYPE_PARAM = "type";
export const ADMIN_AGED_STATUS_PARAM = "status";
export const ADMIN_AGED_AGE_PARAM = "age";

export type AdminAgedLeadTypeFilter = "all" | string;

export function buildAdminAgedTypeFilterOptions(
  categories: Array<{ type: string; label: string }>,
): Array<{ value: AdminAgedLeadTypeFilter; label: string }> {
  return [
    { value: "all", label: "All" },
    ...categories.map((category) => ({
      value: category.type,
      label: category.label,
    })),
  ];
}

/** @deprecated Use buildAdminAgedTypeFilterOptions with live categories */
export const ADMIN_AGED_TYPE_FILTER_OPTIONS: {
  value: AdminAgedLeadTypeFilter;
  label: string;
}[] = [{ value: "all", label: "All" }];

export const ADMIN_AGED_STATUS_FILTER_VALUES = [
  "unmatched",
  "delivered",
  "integrity_posted",
  "review",
] as const;

export type AdminAgedLeadStatusFilter =
  | "all"
  | (typeof ADMIN_AGED_STATUS_FILTER_VALUES)[number];

export const ADMIN_AGED_STATUS_FILTER_OPTIONS: {
  value: AdminAgedLeadStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "unmatched", label: "Unmatched" },
  { value: "delivered", label: "Delivered" },
  { value: "integrity_posted", label: "Integrity posted" },
  { value: "review", label: "Review" },
];

/** Default filter values = String(tier.minDays) from default tiers. */
export const ADMIN_AGED_AGE_BUCKETS = DEFAULT_AGED_PRICE_TIERS.map((t) =>
  String(t.minDays),
);

export type AdminAgedLeadAgeFilter = string;

export type AdminAgedLeadAgeFilterValue = "all" | AdminAgedLeadAgeFilter;

/** @deprecated Prefer buildAgedAgeFilterOptions(getAgedPriceTiers()) */
export const ADMIN_AGED_AGE_FILTER_OPTIONS: {
  value: AdminAgedLeadAgeFilterValue;
  label: string;
}[] = buildAgedAgeFilterOptions(DEFAULT_AGED_PRICE_TIERS);

export type AdminAgedLeadFilters = {
  states: string[];
  type: AdminAgedLeadTypeFilter;
  status: AdminAgedLeadStatusFilter;
  age: AdminAgedLeadAgeFilterValue;
};

export function parseAdminAgedLeadStates(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s.length === 2),
    ),
  );
}

export function parseAdminAgedLeadFilters(
  searchParams: {
    state?: string;
    type?: string;
    status?: string;
    age?: string;
  },
  knownTypes: string[] = [],
  knownAgeBuckets: string[] = ADMIN_AGED_AGE_BUCKETS,
): AdminAgedLeadFilters {
  const typeRaw = searchParams.type?.trim();
  const type: AdminAgedLeadTypeFilter =
    typeRaw && knownTypes.includes(typeRaw) ? typeRaw : "all";

  const statusRaw = searchParams.status?.trim();
  const status: AdminAgedLeadStatusFilter =
    statusRaw &&
    ADMIN_AGED_STATUS_FILTER_VALUES.includes(
      statusRaw as (typeof ADMIN_AGED_STATUS_FILTER_VALUES)[number],
    )
      ? (statusRaw as AdminAgedLeadStatusFilter)
      : "all";

  const ageRaw = searchParams.age?.trim();
  const age: AdminAgedLeadAgeFilterValue =
    ageRaw && knownAgeBuckets.includes(ageRaw) ? ageRaw : "all";

  return {
    states: parseAdminAgedLeadStates(searchParams.state),
    type,
    status,
    age,
  };
}

function findTierForAgeBucket(
  age: AdminAgedLeadAgeFilter,
  tiers: AgedPriceTier[],
): AgedPriceTier | null {
  return tiers.find((tier) => String(tier.minDays) === age) ?? null;
}

/** Prisma receivedAt filter for a tier age bucket. */
export function resolveAgedLeadAgeReceivedAt(
  age: AdminAgedLeadAgeFilter,
  tiers: AgedPriceTier[] = DEFAULT_AGED_PRICE_TIERS,
): Prisma.DateTimeFilter {
  const tier = findTierForAgeBucket(age, tiers);
  if (!tier) {
    const maxCutoff = new Date();
    maxCutoff.setDate(maxCutoff.getDate() - Number(age));
    return { lte: maxCutoff };
  }
  return resolveAgedTierReceivedAtFilter(tier);
}

function intersectReceivedAt(
  baseLte: Date,
  bucket: Prisma.DateTimeFilter,
): Prisma.DateTimeFilter {
  const lte =
    bucket.lte instanceof Date
      ? bucket.lte < baseLte
        ? bucket.lte
        : baseLte
      : baseLte;
  const out: Prisma.DateTimeFilter = { lte };
  if (bucket.gte) out.gte = bucket.gte;
  return out;
}

export async function buildAdminAgedLeadsWhere(
  filters: AdminAgedLeadFilters,
): Promise<Prisma.LeadWhereInput> {
  const [cutoff, tiers] = await Promise.all([
    getAgedCutoffDate(),
    getAgedPriceTiers(),
  ]);
  const extra: Prisma.LeadWhereInput = {};

  if (filters.states.length > 0) {
    extra.state = { in: filters.states };
  }
  if (filters.type !== "all") {
    extra.leadType = filters.type;
  }
  if (filters.status !== "all") {
    extra.status = filters.status as LeadStatus;
  }

  if (filters.age !== "all") {
    extra.receivedAt = intersectReceivedAt(
      cutoff,
      resolveAgedLeadAgeReceivedAt(filters.age, tiers),
    );
  }

  return buildAgedLeadWhereWithCutoff(cutoff, extra);
}

/** Max aged leads loaded once for partner marketplace client-side filters. */
export const PARTNER_AGED_CLIENT_LOAD_LIMIT = 2500;

export function partnerAgedLeadAgeDays(receivedAt: Date | string): number {
  return Math.floor(
    (Date.now() - new Date(receivedAt).getTime()) / (1000 * 60 * 60 * 24),
  );
}

/** Mirrors `resolveAgedLeadAgeReceivedAt` buckets for in-memory partner filtering. */
export function partnerAgedLeadMatchesAgeDays(
  ageDays: number,
  bucket: AdminAgedLeadAgeFilter,
  tiers: AgedPriceTier[] = DEFAULT_AGED_PRICE_TIERS,
): boolean {
  const tier = findTierForAgeBucket(bucket, tiers);
  if (!tier) return false;
  if (ageDays < tier.minDays) return false;
  if (tier.maxDays == null) return true;
  return ageDays <= tier.maxDays;
}

export function partnerAgedLeadMatchesAgeBucket(
  receivedAt: Date | string,
  bucket: AdminAgedLeadAgeFilter,
  tiers: AgedPriceTier[] = DEFAULT_AGED_PRICE_TIERS,
): boolean {
  return partnerAgedLeadMatchesAgeDays(
    partnerAgedLeadAgeDays(receivedAt),
    bucket,
    tiers,
  );
}

export type PartnerAgedClientFilters = {
  states: string[];
  types: string[];
  ages: string[];
};

/** Comma-separated URL values validated against a known allow-list (OR within dimension). */
export function parsePartnerAgedMultiParam(
  raw: string | undefined,
  knownValues: string[],
): string[] {
  if (!raw?.trim() || knownValues.length === 0) return [];
  const known = new Set(knownValues);
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && known.has(s)),
    ),
  );
}

export function parsePartnerAgedClientFilters(
  searchParams: {
    state?: string;
    type?: string;
    age?: string;
  },
  knownTypes: string[] = [],
  knownAgeBuckets: string[] = ADMIN_AGED_AGE_BUCKETS,
): PartnerAgedClientFilters {
  return {
    states: parseAdminAgedLeadStates(searchParams.state),
    types: parsePartnerAgedMultiParam(searchParams.type, knownTypes),
    ages: parsePartnerAgedMultiParam(searchParams.age, knownAgeBuckets),
  };
}

export function filterPartnerAgedLeadsInMemory<
  T extends {
    state: string;
    leadType: string;
    receivedAt?: string | Date;
    ageDays?: number;
  },
>(
  leads: T[],
  filters: PartnerAgedClientFilters,
  tiers: AgedPriceTier[] = DEFAULT_AGED_PRICE_TIERS,
): T[] {
  const knownBuckets = new Set(tiers.map((t) => String(t.minDays)));
  return leads.filter((lead) => {
    if (filters.states.length > 0 && !filters.states.includes(lead.state)) {
      return false;
    }
    if (filters.types.length > 0 && !filters.types.includes(lead.leadType)) {
      return false;
    }
    if (filters.ages.length > 0) {
      const ageDays =
        lead.ageDays ??
        (lead.receivedAt != null
          ? partnerAgedLeadAgeDays(lead.receivedAt)
          : null);
      const matchesAge =
        ageDays != null &&
        filters.ages.some(
          (age) =>
            knownBuckets.has(age) &&
            partnerAgedLeadMatchesAgeDays(ageDays, age, tiers),
        );
      if (!matchesAge) return false;
    }
    return true;
  });
}

export function adminAgedLeadFiltersToSearchParams(
  filters: AdminAgedLeadFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.states.length > 0) {
    params.set(ADMIN_AGED_STATE_PARAM, filters.states.join(","));
  }
  if (filters.type !== "all") params.set(ADMIN_AGED_TYPE_PARAM, filters.type);
  if (filters.status !== "all") {
    params.set(ADMIN_AGED_STATUS_PARAM, filters.status);
  }
  if (filters.age !== "all") params.set(ADMIN_AGED_AGE_PARAM, filters.age);
  return params;
}
