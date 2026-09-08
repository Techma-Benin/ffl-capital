import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { resolveLeadViewDateRange } from "@/lib/admin/admin-date-period";
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
  const deliveredAt = resolveLeadViewDateRange(f);

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

  const statusWhere = partnerLeadStatusWhere(statuses);

  return {
    partnerId,
    ...(validatedFilterSetId ? { filterSetId: validatedFilterSetId } : {}),
    ...(Object.keys(leadWhere).length ? { lead: leadWhere } : {}),
    ...(channels.length ? { channel: { in: channels } } : {}),
    ...(deliveredAt ? { deliveredAt } : {}),
    ...statusWhere,
  };
}

export function partnerLeadStatusWhere(
  statuses: string[],
): Prisma.LeadDeliveryWhereInput {
  const includeActive = !statuses.length || statuses.includes("active");
  const includePending = !statuses.length || statuses.includes("refund_pending");
  const includeRefunded = statuses.includes("refunded");

  const statusConditions: Prisma.LeadDeliveryWhereInput[] = [];
  if (includeActive) {
    statusConditions.push({
      refundedAt: null,
      refundRequests: { none: {} },
    });
  }
  if (includePending) {
    statusConditions.push({
      refundedAt: null,
      refundRequests: { some: {} },
    });
  }
  if (includeRefunded) {
    statusConditions.push({ refundedAt: { not: null } });
  }

  if (statusConditions.length === 1) {
    return statusConditions[0] ?? {};
  }
  return { OR: statusConditions };
}
