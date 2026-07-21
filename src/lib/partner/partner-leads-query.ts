import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  parsePartnerFilters,
  type PartnerLeadViewFilters,
} from "@/lib/leads/list-view-schema";

export async function buildPartnerLeadsWhere(
  partnerId: string,
  filters: PartnerLeadViewFilters | unknown,
): Promise<Prisma.LeadDeliveryWhereInput> {
  const f = parsePartnerFilters(filters);

  const locations = f.locations ?? [];
  const channels = f.channels ?? [];
  const types = f.types ?? [];
  const statuses = f.statuses ?? [];

  let validatedFilterSetId: string | null = null;
  if (f.filterSetId) {
    validatedFilterSetId =
      (
        await prisma.partnerFilterSet.findFirst({
          where: { id: f.filterSetId, partnerId },
          select: { id: true },
        })
      )?.id ?? null;
  }

  const leadWhere: Prisma.LeadWhereInput = {};
  if (locations.length) leadWhere.state = { in: locations };
  if (types.length) leadWhere.leadType = { in: types };

  const statusConditions: Prisma.LeadDeliveryWhereInput[] = [];
  if (!statuses.length || statuses.includes("active")) {
    statusConditions.push({
      refundedAt: null,
      refundRequests: { none: {} },
    });
  }
  if (!statuses.length || statuses.includes("refund_pending")) {
    statusConditions.push({
      refundedAt: null,
      refundRequests: { some: {} },
    });
  }
  if (!statuses.length || statuses.includes("refunded")) {
    statusConditions.push({ refundedAt: { not: null } });
  }

  return {
    partnerId,
    ...(validatedFilterSetId ? { filterSetId: validatedFilterSetId } : {}),
    ...(Object.keys(leadWhere).length ? { lead: leadWhere } : {}),
    ...(channels.length ? { channel: { in: channels } } : {}),
    ...(statuses.length && statuses.length < 3
      ? { OR: statusConditions }
      : {}),
  };
}
