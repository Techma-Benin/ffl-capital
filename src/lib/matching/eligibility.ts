import { LeadType, Partner, PartnerStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDefaultRealtimePrice } from "@/lib/settings/app-settings";

const MIN_FILTER_STATES = 15;

type PartnerWithBalance = Partner;

export function getEffectivePrice(
  partner: PartnerWithBalance,
  defaultPrice: number,
): number {
  if (partner.priceOverride !== null) {
    return Number(partner.priceOverride);
  }
  return defaultPrice;
}

export function isPartnerEligibleForLead(
  partner: PartnerWithBalance,
  leadState: string,
  leadType: LeadType,
  effectivePrice: number,
): boolean {
  if (partner.status !== PartnerStatus.active) return false;
  if (partner.filterStates.length < MIN_FILTER_STATES) return false;
  if (!partner.filterStates.includes(leadState)) return false;
  if (partner.leadType !== leadType) return false;
  if (Number(partner.walletBalance) < effectivePrice) return false;
  return true;
}

export async function findEligiblePartners(
  leadState: string,
  leadType: LeadType,
  options?: { excludePartnerIds?: string[] },
): Promise<Array<PartnerWithBalance & { effectivePrice: number }>> {
  const defaultPrice = await getDefaultRealtimePrice();
  const exclude = new Set(options?.excludePartnerIds ?? []);

  const candidates = await prisma.partner.findMany({
    where: {
      status: PartnerStatus.active,
      leadType,
      filterStates: { has: leadState },
      ...(exclude.size > 0 ? { id: { notIn: Array.from(exclude) } } : {}),
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  return candidates
    .filter((partner) => {
      const price = getEffectivePrice(partner, defaultPrice);
      return isPartnerEligibleForLead(partner, leadState, leadType, price);
    })
    .map((partner) => ({
      ...partner,
      effectivePrice: getEffectivePrice(partner, defaultPrice),
    }));
}

export async function getPartnerById(
  partnerId: string,
  tx?: Prisma.TransactionClient,
): Promise<Partner | null> {
  const client = tx ?? prisma;
  return client.partner.findUnique({ where: { id: partnerId } });
}
