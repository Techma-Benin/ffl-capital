import {
  DeliveryChannel,
  LeadEventType,
  PartnerStatus,
  TransactionType,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { PRISMA_TX_OPTIONS } from "@/lib/db-transaction";
import {
  buildAgedLeadWhere,
  getNextAgedBracketStart,
  AGED_RETIRED_SENTINEL,
} from "@/lib/aged/eligibility";
import { deliverLead } from "@/lib/delivery/deliver-lead";
import { emitLeadEvent } from "@/lib/leads/lead-events";
import { debitWallet } from "@/lib/wallet/ledger";
import { getDefaultAgedPrice } from "@/lib/settings/app-settings";

export interface AgedPurchaseResult {
  purchased: Array<{
    leadId: string;
    deliveryId: string;
    firstName: string;
    lastName: string;
  }>;
  failed: Array<{ leadId: string; reason: string }>;
}

export async function purchaseAgedLeads(
  partnerId: string,
  leadIds: string[],
): Promise<AgedPurchaseResult> {
  const partner = await prisma.partner.findUniqueOrThrow({
    where: { id: partnerId },
  });

  if (partner.status !== PartnerStatus.active) {
    throw new Error("Partner account is not active");
  }

  const agedPrice = await getDefaultAgedPrice();
  const purchased: AgedPurchaseResult["purchased"] = [];
  const failed: AgedPurchaseResult["failed"] = [];

  for (const leadId of leadIds) {
    try {
      const { deliveryId, firstName, lastName } = await purchaseSingleAgedLead(
        partnerId,
        leadId,
        agedPrice,
      );
      purchased.push({ leadId, deliveryId, firstName, lastName });
    } catch (err) {
      failed.push({
        leadId,
        reason: err instanceof Error ? err.message : "Purchase failed",
      });
    }
  }

  return { purchased, failed };
}

async function purchaseSingleAgedLead(
  partnerId: string,
  leadId: string,
  agedPrice: number,
): Promise<{ deliveryId: string; firstName: string; lastName: string }> {
  const agedWhere = await buildAgedLeadWhere();
  const result = await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findFirst({
      where: { id: leadId, ...agedWhere },
    });

    if (!lead) throw new Error("Lead not available for aged purchase");

    const partner = await tx.partner.findUniqueOrThrow({
      where: { id: partnerId },
    });

    if (Number(partner.walletBalance) < agedPrice) {
      throw new Error("Insufficient wallet balance");
    }

    const delivery = await tx.leadDelivery.create({
      data: {
        leadId: lead.id,
        partnerId,
        channel: DeliveryChannel.aged,
        price: agedPrice,
      },
    });

    await debitWallet(partnerId, agedPrice, TransactionType.aged_purchase, {
      tx,
      leadDeliveryId: delivery.id,
      description: `Aged lead purchase: ${lead.state}`,
    });

    // Increment aged sale count and determine next availability
    const newSaleCount = lead.agedSaleCount + 1;
    let agedAvailableAfter: Date | null = null;

    if (newSaleCount >= 2) {
      // Lead has been sold twice — permanently retire it from the marketplace
      agedAvailableAfter = AGED_RETIRED_SENTINEL;
    } else {
      // First sale — hide it until it ages into the next bracket
      const nextBracket = getNextAgedBracketStart(lead.receivedAt);
      if (nextBracket) {
        agedAvailableAfter = nextBracket;
      } else {
        // Already in the final (90+) bracket; retire after first purchase too
        agedAvailableAfter = AGED_RETIRED_SENTINEL;
      }
    }

    await tx.lead.update({
      where: { id: lead.id },
      data: {
        agedSaleCount: newSaleCount,
        agedAvailableAfter,
      },
    });

    return {
      deliveryId: delivery.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
    };
  }, PRISMA_TX_OPTIONS);

  await deliverLead(result.deliveryId);

  const delivery = await prisma.leadDelivery.findUnique({
    where: { id: result.deliveryId },
  });
  if (delivery) {
    await emitLeadEvent(leadId, LeadEventType.aged_purchased, {
      deliveryId: result.deliveryId,
      partnerId,
      price: agedPrice,
    });
  }

  return result;
}
