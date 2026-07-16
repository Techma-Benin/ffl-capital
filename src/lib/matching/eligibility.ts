import {
  Lead,
  Partner,
  PartnerFilterSet,
  PartnerStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDefaultRealtimePrice } from "@/lib/settings/app-settings";
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
  // Allow-list checks (empty array = any)
  if (criteria.intent && criteria.intent.length > 0) {
    if (!lead.intent || !criteria.intent.includes(lead.intent)) return false;
  }
  if (criteria.haveIul && criteria.haveIul.length > 0) {
    if (!lead.haveIul || !criteria.haveIul.includes(lead.haveIul)) return false;
  }
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

export function isFilterSetEligibleForLead(
  filterSet: PartnerFilterSet,
  partner: Partner,
  leadState: string,
  leadType: string,
  effectivePrice: number,
  lead?: Lead,
): boolean {
  if (!filterSet.active) return false;
  if (partner.status !== PartnerStatus.active) return false;
  if (filterSet.filterStates.length < MIN_FILTER_STATES) return false;
  if (!filterSet.filterStates.includes(leadState)) return false;
  if (filterSet.leadType !== leadType) return false;
  if (Number(partner.walletBalance) < effectivePrice) return false;

  // Extended filter criteria check
  if (lead) {
    const criteria = parseFilterCriteria(filterSet.filterCriteria);
    if (!matchesFilterCriteria(criteria, lead, filterSet.filterStates))
      return false;
  }

  return true;
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

async function isWithinLimits(filterSet: PartnerFilterSet): Promise<boolean> {
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
  options?: { excludePartnerIds?: string[]; lead?: Lead },
): Promise<FilterSetWithPartner[]> {
  // Skip matching if the category is disabled
  const category = await prisma.leadCategory.findUnique({
    where: { type: leadType },
    select: { enabled: true },
  });
  if (!category || !category.enabled) {
    return [];
  }

  const defaultPrice = await getDefaultRealtimePrice();
  const exclude = new Set(options?.excludePartnerIds ?? []);

  const filterSets = await prisma.partnerFilterSet.findMany({
    where: {
      active: true,
      leadType,
      filterStates: { has: leadState },
      partner: {
        status: PartnerStatus.active,
        ...(exclude.size > 0 ? { id: { notIn: Array.from(exclude) } } : {}),
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
    const effectivePrice = getEffectivePrice(filterSet, defaultPrice);
    if (
      !isFilterSetEligibleForLead(
        filterSet,
        filterSet.partner,
        leadState,
        leadType,
        effectivePrice,
        options?.lead,
      )
    ) {
      continue;
    }
    if (!(await isWithinLimits(filterSet))) continue;
    eligible.push({ ...filterSet, effectivePrice });
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
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [weekly, monthly] = await Promise.all([
    countDeliveriesInWindow(filterSetId, sevenDaysAgo),
    countDeliveriesInWindow(filterSetId, thirtyDaysAgo),
  ]);

  return { weekly, monthly };
}
