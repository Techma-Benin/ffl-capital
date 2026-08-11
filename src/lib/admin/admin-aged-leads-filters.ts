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
  "aged_listed",
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
  { value: "aged_listed", label: "Aged listed" },
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
export function partnerAgedLeadMatchesAgeBucket(
  receivedAt: Date | string,
  bucket: AdminAgedLeadAgeFilter,
  tiers: AgedPriceTier[] = DEFAULT_AGED_PRICE_TIERS,
): boolean {
  const tier = findTierForAgeBucket(bucket, tiers);
  if (!tier) return false;
  return partnerAgedLeadMatchesTier(receivedAt, tier);
}

export const PARTNER_AGED_HAVE_IUL_PARAM = "haveIul";

/** URL / filter value for leads with no Have IUL answer. */
export const PARTNER_AGED_HAVE_IUL_EMPTY = "empty";

export type PartnerAgedHaveIulFilterValue =
  | "all"
  | "Yes"
  | "No"
  | typeof PARTNER_AGED_HAVE_IUL_EMPTY;

export const PARTNER_AGED_HAVE_IUL_FILTER_OPTIONS: {
  value: PartnerAgedHaveIulFilterValue;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
  { value: PARTNER_AGED_HAVE_IUL_EMPTY, label: "Empty" },
];

export type PartnerAgedClientFilters = {
  states: string[];
  type: string;
  age: string;
  haveIul: string;
};

function parsePartnerAgedHaveIulFilter(raw: string | undefined): string {
  const trimmed = raw?.trim();
  if (!trimmed) return "";
  if (trimmed === PARTNER_AGED_HAVE_IUL_EMPTY) return PARTNER_AGED_HAVE_IUL_EMPTY;
  const normalized =
    trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  if (normalized === "Yes" || normalized === "No") return normalized;
  return "";
}

export function parsePartnerAgedClientFilters(
  searchParams: {
    state?: string;
    type?: string;
    age?: string;
    haveIul?: string;
  },
  knownTypes: string[] = [],
  knownAgeBuckets: string[] = ADMIN_AGED_AGE_BUCKETS,
): PartnerAgedClientFilters {
  const typeRaw = searchParams.type?.trim();
  const type =
    typeRaw && knownTypes.includes(typeRaw) ? typeRaw : "";

  const ageRaw = searchParams.age?.trim();
  const age =
    ageRaw && knownAgeBuckets.includes(ageRaw) ? ageRaw : "";

  return {
    states: parseAdminAgedLeadStates(searchParams.state),
    type,
    age,
    haveIul: parsePartnerAgedHaveIulFilter(searchParams.haveIul),
  };
}

function partnerAgedLeadHaveIulMatches(
  haveIul: string | null | undefined,
  filter: string,
): boolean {
  if (filter === PARTNER_AGED_HAVE_IUL_EMPTY) {
    return haveIul == null || haveIul.trim() === "";
  }
  return (haveIul ?? "").toLowerCase() === filter.toLowerCase();
}

export function filterPartnerAgedLeadsInMemory<
  T extends {
    state: string;
    leadType: string;
    receivedAt: string | Date;
    haveIul?: string | null;
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
    if (filters.type && lead.leadType !== filters.type) return false;
    if (
      filters.age &&
      knownBuckets.has(filters.age) &&
      !partnerAgedLeadMatchesAgeBucket(lead.receivedAt, filters.age, tiers)
    ) {
      return false;
    }
    if (
      filters.haveIul &&
      !partnerAgedLeadHaveIulMatches(lead.haveIul, filters.haveIul)
    ) {
      return false;
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
