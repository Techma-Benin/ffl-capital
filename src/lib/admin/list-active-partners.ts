import { PartnerStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { uniquePartnerIdsWithNonRefundedRealtimeSale } from "@/lib/leads/realtime-sale-cap";

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

export async function listActivePartnersForPicker(
  excludeLeadIds: string[] = [],
): Promise<ActivePartnerPickerRow[]> {
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

  return prisma.partner.findMany({
    where: {
      status: PartnerStatus.active,
      ...(excludePartnerIds.length > 0
        ? { id: { notIn: excludePartnerIds } }
        : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: pickerSelect,
  });
}
