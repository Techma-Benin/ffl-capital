import { LeadStatus, Prisma } from "@prisma/client";
import { buildAgedLeadWhereWithCutoff, getAgedCutoffDate } from "@/lib/aged/eligibility";

export const ADMIN_AGED_STATE_PARAM = "state";
export const ADMIN_AGED_TYPE_PARAM = "type";
export const ADMIN_AGED_STATUS_PARAM = "status";
export const ADMIN_AGED_AGE_PARAM = "age";

export const ADMIN_AGED_LEAD_TYPES = [
  "traditional_iul",
  "high_intent_iul",
] as const;

export type AdminAgedLeadType = (typeof ADMIN_AGED_LEAD_TYPES)[number];

export const ADMIN_AGED_TYPE_FILTER_OPTIONS: {
  value: "all" | AdminAgedLeadType;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "traditional_iul", label: "Trad. IUL" },
  { value: "high_intent_iul", label: "High Intent" },
];

export type AdminAgedLeadTypeFilter = "all" | AdminAgedLeadType;

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

export const ADMIN_AGED_AGE_BUCKETS = ["30", "60", "90"] as const;
export type AdminAgedLeadAgeFilter = (typeof ADMIN_AGED_AGE_BUCKETS)[number];

export type AdminAgedLeadAgeFilterValue = "all" | AdminAgedLeadAgeFilter;

export const ADMIN_AGED_AGE_FILTER_OPTIONS: {
  value: AdminAgedLeadAgeFilterValue;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "30", label: "30–60 days" },
  { value: "60", label: "60–90 days" },
  { value: "90", label: "90+ days" },
];

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

export function parseAdminAgedLeadFilters(searchParams: {
  state?: string;
  type?: string;
  status?: string;
  age?: string;
}): AdminAgedLeadFilters {
  const typeRaw = searchParams.type?.trim();
  const type: AdminAgedLeadTypeFilter =
    typeRaw &&
    ADMIN_AGED_LEAD_TYPES.includes(typeRaw as AdminAgedLeadType)
      ? (typeRaw as AdminAgedLeadType)
      : "all";

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
    ageRaw && ADMIN_AGED_AGE_BUCKETS.includes(ageRaw as AdminAgedLeadAgeFilter)
      ? (ageRaw as AdminAgedLeadAgeFilter)
      : "all";

  return {
    states: parseAdminAgedLeadStates(searchParams.state),
    type,
    status,
    age,
  };
}

/** Partner aged marketplace uses the same day buckets. */
export function resolveAgedLeadAgeReceivedAt(
  age: AdminAgedLeadAgeFilter,
): Prisma.DateTimeFilter {
  const minDays = Number(age);
  const maxCutoff = new Date();
  maxCutoff.setDate(maxCutoff.getDate() - minDays);

  if (age === "30") {
    const minCutoff = new Date();
    minCutoff.setDate(minCutoff.getDate() - 60);
    return { lte: maxCutoff, gte: minCutoff };
  }
  if (age === "60") {
    const minCutoff = new Date();
    minCutoff.setDate(minCutoff.getDate() - 90);
    return { lte: maxCutoff, gte: minCutoff };
  }
  return { lte: maxCutoff };
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
  const cutoff = await getAgedCutoffDate();
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
      resolveAgedLeadAgeReceivedAt(filters.age),
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
): boolean {
  const ageDays = partnerAgedLeadAgeDays(receivedAt);
  if (bucket === "30") return ageDays >= 30 && ageDays <= 60;
  if (bucket === "60") return ageDays >= 60 && ageDays <= 90;
  return ageDays >= 90;
}

export function filterPartnerAgedLeadsInMemory<
  T extends { state: string; leadType: string; receivedAt: string | Date },
>(
  leads: T[],
  filters: { state: string; type: string; age: string },
): T[] {
  return leads.filter((lead) => {
    if (filters.state && lead.state !== filters.state) return false;
    if (filters.type && lead.leadType !== filters.type) return false;
    if (
      filters.age &&
      ADMIN_AGED_AGE_BUCKETS.includes(filters.age as AdminAgedLeadAgeFilter) &&
      !partnerAgedLeadMatchesAgeBucket(
        lead.receivedAt,
        filters.age as AdminAgedLeadAgeFilter,
      )
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
