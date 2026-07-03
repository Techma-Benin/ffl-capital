import {
  DeliveryChannel,
  LeadStatus,
  LeadType,
  PartnerStatus,
  TransactionType,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildAgedLeadWhere } from "@/lib/aged/eligibility";
import { deliverLead } from "@/lib/delivery/deliver-lead";
import { debitWallet } from "@/lib/wallet/ledger";
import { getDefaultAgedPrice } from "@/lib/settings/app-settings";

const MIN_FILTER_STATES = 15;

export interface AgedPurchaseResult {
  purchased: Array<{ leadId: string; deliveryId: string }>;
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
  if (partner.filterStates.length < MIN_FILTER_STATES) {
    throw new Error("Partner must have at least 15 target states");
  }

  const agedPrice = await getDefaultAgedPrice();
  const purchased: AgedPurchaseResult["purchased"] = [];
  const failed: AgedPurchaseResult["failed"] = [];

  for (const leadId of leadIds) {
    try {
      const deliveryId = await purchaseSingleAgedLead(
        partnerId,
        leadId,
        partner.filterStates,
        partner.leadType,
        agedPrice,
      );
      purchased.push({ leadId, deliveryId });
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
  filterStates: string[],
  partnerLeadType: LeadType,
  agedPrice: number,
): Promise<string> {
  const result = await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findFirst({
      where: {
        id: leadId,
        ...buildAgedLeadWhere(),
      },
    });

    if (!lead) throw new Error("Lead not available for aged purchase");
    if (!filterStates.includes(lead.state)) {
      throw new Error("Lead state not in your target states");
    }
    if (lead.leadType !== partnerLeadType) {
      throw new Error("Lead type does not match your account");
    }

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

    return delivery.id;
  });

  await deliverLead(result);
  return result;
}
