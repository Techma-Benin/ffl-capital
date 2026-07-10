import {
  LeadType,
  Partner,
  PartnerFilterSet,
  PartnerStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDefaultRealtimePrice } from "@/lib/settings/app-settings";

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

export function isFilterSetEligibleForLead(
  filterSet: PartnerFilterSet,
  partner: Partner,
  leadState: string,
  leadType: LeadType,
  effectivePrice: number,
): boolean {
  if (!filterSet.active) return false;
  if (partner.status !== PartnerStatus.active) return false;
  if (filterSet.filterStates.length < MIN_FILTER_STATES) return false;
  if (!filterSet.filterStates.includes(leadState)) return false;
  if (filterSet.leadType !== leadType) return false;
  if (Number(partner.walletBalance) < effectivePrice) return false;
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

  if (filterSet.hourlyLimit !== null) {
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const hourlyCount = await countDeliveriesInWindow(filterSet.id, hourAgo);
    if (hourlyCount >= filterSet.hourlyLimit) return false;
  }

  if (filterSet.dailyLimit !== null) {
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dailyCount = await countDeliveriesInWindow(filterSet.id, dayAgo);
    if (dailyCount >= filterSet.dailyLimit) return false;
  }

  return true;
}

export async function findEligibleFilterSets(
  leadState: string,
  leadType: LeadType,
  options?: { excludePartnerIds?: string[] },
): Promise<FilterSetWithPartner[]> {
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
  leadType: LeadType,
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
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [hourly, daily] = await Promise.all([
    countDeliveriesInWindow(filterSetId, hourAgo),
    countDeliveriesInWindow(filterSetId, dayAgo),
  ]);

  return { hourly, daily };
}
