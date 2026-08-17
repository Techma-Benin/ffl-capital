import { DeliveryChannel, LeadEventType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PRISMA_TX_OPTIONS } from "@/lib/db-transaction";
import { AGED_RETIRED_SENTINEL } from "@/lib/aged/eligibility";
import { emitLeadEvent } from "@/lib/leads/lead-events";

export const PARTNER_AGED_SOLD_WINDOW_DAYS = 7;

const PARTNER_AGED_SOLD_WINDOW_MS =
  PARTNER_AGED_SOLD_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export function isWithinPartnerAgedSoldWindow(
  deliveredAt: Date,
  now = new Date(),
): boolean {
  return now.getTime() - deliveredAt.getTime() <= PARTNER_AGED_SOLD_WINDOW_MS;
}

export function canPartnerMarkAgedLeadAsSold(params: {
  channel: string;
  partnerSoldAt: Date | null;
  deliveredAt: Date;
  agedSaleCount: number;
  isRefunded: boolean;
  now?: Date;
}): boolean {
  if (params.channel !== DeliveryChannel.aged) return false;
  if (params.partnerSoldAt) return false;
  if (params.isRefunded) return false;
  // Only the first aged marketplace sale can block a second resale.
  if (params.agedSaleCount !== 1) return false;
  return isWithinPartnerAgedSoldWindow(params.deliveredAt, params.now);
}

export async function markPartnerAgedLeadSold(
  deliveryId: string,
  partnerId: string,
): Promise<{ partnerSoldAt: Date }> {
  const delivery = await prisma.leadDelivery.findUnique({
    where: { id: deliveryId },
    include: { lead: true },
  });

  if (!delivery || delivery.partnerId !== partnerId) {
    throw new Error("Delivery not found");
  }

  if (
    !canPartnerMarkAgedLeadAsSold({
      channel: delivery.channel,
      partnerSoldAt: delivery.partnerSoldAt,
      deliveredAt: delivery.deliveredAt,
      agedSaleCount: delivery.lead.agedSaleCount,
      isRefunded: delivery.refundedAt != null,
    })
  ) {
    throw new Error("This lead cannot be marked as sold");
  }

  const partnerSoldAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.leadDelivery.update({
      where: { id: deliveryId },
      data: { partnerSoldAt },
    });

    await tx.lead.update({
      where: { id: delivery.leadId },
      data: { agedAvailableAfter: AGED_RETIRED_SENTINEL },
    });

    await emitLeadEvent(
      delivery.leadId,
      LeadEventType.aged_partner_sold,
      { deliveryId, partnerId },
      partnerId,
      tx,
    );
  }, PRISMA_TX_OPTIONS);

  return { partnerSoldAt };
}
