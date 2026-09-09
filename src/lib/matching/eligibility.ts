import {
  Lead,
  Partner,
  PartnerFilterSet,
  PartnerStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDefaultRealtimePrice } from "@/lib/settings/app-settings";
import { matchesAllowListWithEmpty } from "@/lib/filter-sets/criteria-options";
import { FilterCriteria } from "./types";

const MIN_FILTER_STATES = 15;

export type FilterSetWithPartner = PartnerFilterSet & {
  partner: Partner;
  effectivePrice: number;
};

export function getEffectivePrice(
  filterSet: PartnerFilterSet,
  defaultPrice: number,
): number {
  if (filterSet.priceOverride !== null) {
    return Number(filterSet.priceOverride);
  }
  return defaultPrice;
}

function parseFilterCriteria(raw: unknown): FilterCriteria {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as FilterCriteria;
  }
  return {};
}

function matchesFilterCriteria(
  criteria: FilterCriteria,
  lead: Lead,
  filterStates: string[],
): boolean {
  // Allow-list checks (empty array = any; "empty" matches null/blank)
  if (!matchesAllowListWithEmpty(criteria.intent, lead.intent)) return false;
  if (!matchesAllowListWithEmpty(criteria.haveIul, lead.haveIul)) return false;
  if (criteria.boberdooLeadType && criteria.boberdooLeadType.length > 0) {
    if (
      !lead.boberdooLeadType ||
      !criteria.boberdooLeadType.includes(lead.boberdooLeadType)
    )
      return false;
  }

  // Age range — fail closed: if criteria are set but age is missing/unparseable, reject
  if (criteria.ageMin !== undefined || criteria.ageMax !== undefined) {
    const age = lead.age ? parseInt(lead.age, 10) : NaN;
    if (isNaN(age)) return false; // age required when a range is configured
    if (criteria.ageMin !== undefined && age < criteria.ageMin) return false;
    if (criteria.ageMax !== undefined && age > criteria.ageMax) return false;
  }

  // Attribution allow/block lists
  if (criteria.source && criteria.source.length > 0) {
    if (!criteria.source.includes(lead.source)) return false;
  }
  if (criteria.excludeSource && criteria.excludeSource.length > 0) {
    if (criteria.excludeSource.includes(lead.source)) return false;
  }
  if (criteria.subId && criteria.subId.length > 0) {
    if (!lead.subId || !criteria.subId.includes(lead.subId)) return false;
  }
  if (criteria.excludeSubId && criteria.excludeSubId.length > 0) {
    if (lead.subId && criteria.excludeSubId.includes(lead.subId)) return false;
  }
  if (criteria.pubId && criteria.pubId.length > 0) {
    if (!lead.pubId || !criteria.pubId.includes(lead.pubId)) return false;
  }
  if (criteria.excludePubId && criteria.excludePubId.length > 0) {
    if (lead.pubId && criteria.excludePubId.includes(lead.pubId)) return false;
  }

  // Schedule (Eastern Time)
  if (criteria.acceptDays && criteria.acceptDays.length > 0) {
    const etDay = new Date()
      .toLocaleDateString("en-US", { weekday: "long", timeZone: "America/New_York" })
      .toLowerCase();
    if (!criteria.acceptDays.includes(etDay)) return false;
  }
  if (criteria.acceptHoursStart !== undefined || criteria.acceptHoursEnd !== undefined) {
    const etHour = parseInt(
      new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone: "America/New_York",
      }),
      10,
    );
    if (!isNaN(etHour)) {
      if (criteria.acceptHoursStart !== undefined && etHour < criteria.acceptHoursStart)
        return false;
      if (criteria.acceptHoursEnd !== undefined && etHour >= criteria.acceptHoursEnd)
        return false;
    }
  }

  return true;
}

export type FilterSetIneligibilityReason =
  | "inactive"
  | "template"
  | "partner_inactive"
  | "too_few_states"
  | "state"
  | "lead_type"
  | "wallet"
  | "criteria";

export function filterSetIneligibilityReason(
  filterSet: PartnerFilterSet,
  partner: Partner,
  leadState: string,
  leadType: string,
  effectivePrice: number,
  lead?: Lead,
  requireWallet = true,
): FilterSetIneligibilityReason | null {
  if (!filterSet.active) return "inactive";
  if (filterSet.isTemplate) return "template";
  if (partner.status !== PartnerStatus.active) return "partner_inactive";
  if (filterSet.filterStates.length < MIN_FILTER_STATES) return "too_few_states";
  if (!filterSet.filterStates.includes(leadState)) return "state";
  if (filterSet.leadType !== leadType) return "lead_type";
  if (requireWallet && Number(partner.walletBalance) < effectivePrice) {
    return "wallet";
  }
  if (lead) {
    const criteria = parseFilterCriteria(filterSet.filterCriteria);
    if (!matchesFilterCriteria(criteria, lead, filterSet.filterStates)) {
      return "criteria";
    }
  }
  return null;
}

export function isFilterSetEligibleForLead(
  filterSet: PartnerFilterSet,
  partner: Partner,
  leadState: string,
  leadType: string,
  effectivePrice: number,
  lead?: Lead,
  requireWallet = true,
): boolean {
  return (
    filterSetIneligibilityReason(
      filterSet,
      partner,
      leadState,
      leadType,
      effectivePrice,
      lead,
      requireWallet,
    ) === null
  );
}

/** Why none of this partner's live filter sets can take the lead (wallet excluded). */
export function explainPartnerFilterIneligibility(
  filterSets: PartnerFilterSet[],
  partner: Partner,
  leadState: string,
  leadType: string,
  lead?: Lead,
): string {
  const live = filterSets.filter((set) => set.active && !set.isTemplate);
  if (live.length === 0) {
    return "This partner has no active filter set.";
  }

  const reasons = new Set(
    live.map((filterSet) =>
      filterSetIneligibilityReason(
        filterSet,
        partner,
        leadState,
        leadType,
        0,
        lead,
        false,
      ),
    ),
  );

  if (reasons.has("criteria")) {
    return "This partner's filter set criteria do not match this lead.";
  }
  if (reasons.has("lead_type")) {
    return "This partner has no filter set for this lead category.";
  }
  if (reasons.has("state")) {
    return "This partner does not target this lead's state.";
  }
  if (reasons.has("too_few_states")) {
    return "This partner's filter sets need at least 15 target states.";
  }
  return "This partner has no eligible filter set for this lead.";
}

async function countDeliveriesInWindow(
  filterSetId: string,
  since: Date,
): Promise<number> {
  return prisma.leadDelivery.count({
    where: {
      filterSetId,
      deliveredAt: { gte: since },
      refundedAt: null,
    },
  });
}

export async function isWithinLimits(filterSet: PartnerFilterSet): Promise<boolean> {
  const now = new Date();

  if (filterSet.weeklyLimit !== null) {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklyCount = await countDeliveriesInWindow(
      filterSet.id,
      sevenDaysAgo,
    );
    if (weeklyCount >= filterSet.weeklyLimit) return false;
  }

  if (filterSet.monthlyLimit !== null) {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthlyCount = await countDeliveriesInWindow(
      filterSet.id,
      thirtyDaysAgo,
    );
    if (monthlyCount >= filterSet.monthlyLimit) return false;
  }

  return true;
}

export async function findEligibleFilterSets(
  leadState: string,
  leadType: string,
  options?: {
    excludePartnerIds?: string[];
    includePartnerIds?: string[];
    lead?: Lead;
  },
): Promise<FilterSetWithPartner[]> {
  // Skip matching if the category is disabled
  const category = await prisma.leadCategory.findUnique({
    where: { type: leadType },
    select: { enabled: true, partnerEnabled: true },
  });
  if (!category || !category.enabled || !category.partnerEnabled) {
    return [];
  }

  const defaultPrice = await getDefaultRealtimePrice();
  const exclude = new Set(options?.excludePartnerIds ?? []);
  const include = options?.includePartnerIds?.filter(Boolean) ?? [];

  const filterSets = await prisma.partnerFilterSet.findMany({
    where: {
      isTemplate: false,
      active: true,
      leadType,
      filterStates: { has: leadState },
      partner: {
        status: PartnerStatus.active,
        ...(include.length > 0
          ? { id: { in: include } }
          : exclude.size > 0
            ? { id: { notIn: Array.from(exclude) } }
            : {}),
      },
    },
    include: { partner: true },
    orderBy: [
      { priority: "desc" },
      { partner: { createdAt: "asc" } },
      { createdAt: "asc" },
    ],
  });

  const eligible: FilterSetWithPartner[] = [];

  for (const filterSet of filterSets) {
    if (!filterSet.partner) continue;
    const partner = filterSet.partner;
    const effectivePrice = getEffectivePrice(filterSet, defaultPrice);
    if (
      !isFilterSetEligibleForLead(
        filterSet,
        partner,
        leadState,
        leadType,
        effectivePrice,
        options?.lead,
      )
    ) {
      continue;
    }
    if (!(await isWithinLimits(filterSet))) continue;
    eligible.push({ ...filterSet, partner, effectivePrice });
  }

  return eligible;
}

/** @deprecated Use findEligibleFilterSets */
export async function findEligiblePartners(
  leadState: string,
  leadType: string,
  options?: { excludePartnerIds?: string[] },
): Promise<Array<Partner & { effectivePrice: number }>> {
  const filterSets = await findEligibleFilterSets(leadState, leadType, options);
  return filterSets.map((fs) => ({
    ...fs.partner,
    effectivePrice: fs.effectivePrice,
  }));
}

export async function getPartnerById(
  partnerId: string,
  tx?: Prisma.TransactionClient,
): Promise<Partner | null> {
  const client = tx ?? prisma;
  return client.partner.findUnique({ where: { id: partnerId } });
}

export async function getFilterSetUsage(filterSetId: string) {
  const map = await getFilterSetUsageBatch([filterSetId]);
  return map.get(filterSetId) ?? { weekly: 0, monthly: 0 };
}

/** Batch delivery usage for many filter sets (avoids Filter List N+1). */
export async function getFilterSetUsageBatch(
  filterSetIds: string[],
): Promise<Map<string, { weekly: number; monthly: number }>> {
  const result = new Map<string, { weekly: number; monthly: number }>();
  for (const id of filterSetIds) {
    result.set(id, { weekly: 0, monthly: 0 });
  }
  if (filterSetIds.length === 0) return result;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [weeklyRows, monthlyRows] = await Promise.all([
    prisma.leadDelivery.groupBy({
      by: ["filterSetId"],
      where: {
        filterSetId: { in: filterSetIds },
        deliveredAt: { gte: sevenDaysAgo },
        refundedAt: null,
      },
      _count: { _all: true },
    }),
    prisma.leadDelivery.groupBy({
      by: ["filterSetId"],
      where: {
        filterSetId: { in: filterSetIds },
        deliveredAt: { gte: thirtyDaysAgo },
        refundedAt: null,
      },
      _count: { _all: true },
    }),
  ]);

  for (const row of weeklyRows) {
    if (!row.filterSetId) continue;
    const entry = result.get(row.filterSetId) ?? { weekly: 0, monthly: 0 };
    entry.weekly = row._count._all;
    result.set(row.filterSetId, entry);
  }
  for (const row of monthlyRows) {
    if (!row.filterSetId) continue;
    const entry = result.get(row.filterSetId) ?? { weekly: 0, monthly: 0 };
    entry.monthly = row._count._all;
    result.set(row.filterSetId, entry);
  }

  return result;
}
