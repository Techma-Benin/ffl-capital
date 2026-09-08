import { PartnerStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  DEFAULT_MAX_REALTIME_SELLS,
  realtimeSalesOnLead,
  remainingRealtimeResales,
  uniquePartnerIdsWithNonRefundedRealtimeSale,
} from "@/lib/leads/realtime-sale-cap";

const pickerSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  affiliation: true,
} satisfies Prisma.PartnerSelect;

export type ActivePartnerPickerRow = Prisma.PartnerGetPayload<{
  select: typeof pickerSelect;
}>;

export type LeadResaleSummary = {
  remaining: number;
  soldCount: number;
  maxRealtimeSells: number;
  blocked: boolean;
};

export async function summarizeLeadResale(
  leadIds: string[],
): Promise<LeadResaleSummary | null> {
  if (leadIds.length === 0) return null;

  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds } },
    select: {
      status: true,
      leadType: true,
      leadDeliveries: {
        select: { partnerId: true, channel: true, refundedAt: true },
      },
    },
  });

  const types = [
    ...new Set(leads.map((lead) => lead.leadType).filter(Boolean)),
  ] as string[];
  const categories =
    types.length === 0
      ? []
      : await prisma.leadCategory.findMany({
          where: { type: { in: types } },
          select: { type: true, maxRealtimeSells: true },
        });
  const maxByType = new Map(
    categories.map((category) => [category.type, category.maxRealtimeSells]),
  );

  const slots = leads.map((lead) => {
    const maxRealtimeSells =
      (lead.leadType ? maxByType.get(lead.leadType) : undefined) ??
      DEFAULT_MAX_REALTIME_SELLS;
    const soldCount = realtimeSalesOnLead({
      deliveries: lead.leadDeliveries,
      status: lead.status,
    });
    return {
      soldCount,
      maxRealtimeSells,
      remaining: remainingRealtimeResales(soldCount, maxRealtimeSells),
    };
  });

  if (slots.length === 0) {
    return {
      remaining: 0,
      soldCount: 0,
      maxRealtimeSells: DEFAULT_MAX_REALTIME_SELLS,
      blocked: true,
    };
  }

  return {
    remaining: Math.min(...slots.map((slot) => slot.remaining)),
    soldCount: Math.max(...slots.map((slot) => slot.soldCount)),
    maxRealtimeSells: Math.min(...slots.map((slot) => slot.maxRealtimeSells)),
    blocked: slots.every((slot) => slot.remaining <= 0),
  };
}

export async function listActivePartnersForPicker(
  excludeLeadIds: string[] = [],
): Promise<{
  partners: ActivePartnerPickerRow[];
  resale: LeadResaleSummary | null;
}> {
  const resale = await summarizeLeadResale(excludeLeadIds);
  if (resale?.blocked) {
    return { partners: [], resale };
  }

  let excludePartnerIds: string[] = [];

  if (excludeLeadIds.length > 0) {
    const deliveries = await prisma.leadDelivery.findMany({
      where: {
        leadId: { in: excludeLeadIds },
        channel: "realtime",
        refundedAt: null,
      },
      select: { partnerId: true, channel: true, refundedAt: true },
    });
    excludePartnerIds = uniquePartnerIdsWithNonRefundedRealtimeSale(deliveries);
  }

  const partners = await prisma.partner.findMany({
    where: {
      status: PartnerStatus.active,
      ...(excludePartnerIds.length > 0
        ? { id: { notIn: excludePartnerIds } }
        : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: pickerSelect,
  });

  return { partners, resale };
}
