import {
  DeliveryChannel,
  Lead,
  LeadStatus,
  Partner,
  TransactionType,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { findEligiblePartners } from "./eligibility";

export interface MatchResult {
  matched: boolean;
  lead: Lead;
  partner?: Partner;
  deliveryId?: string;
  reason?: string;
}

export async function matchLead(leadId: string): Promise<MatchResult> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }

  if (!lead.available || lead.status !== LeadStatus.unmatched) {
    return {
      matched: false,
      lead,
      reason: "Lead is not available for realtime matching",
    };
  }

  const eligible = await findEligiblePartners(lead.state, lead.leadType);
  if (eligible.length === 0) {
    return {
      matched: false,
      lead,
      reason: "No eligible partner found",
    };
  }

  const winner = eligible[0];

  const result = await prisma.$transaction(async (tx) => {
    const freshLead = await tx.lead.findUniqueOrThrow({
      where: { id: leadId },
    });

    if (!freshLead.available || freshLead.status !== LeadStatus.unmatched) {
      return null;
    }

    const freshPartner = await tx.partner.findUniqueOrThrow({
      where: { id: winner.id },
    });

    const price = winner.effectivePrice;
    if (Number(freshPartner.walletBalance) < price) {
      return null;
    }

    const newBalance = Number(freshPartner.walletBalance) - price;

    const delivery = await tx.leadDelivery.create({
      data: {
        leadId: freshLead.id,
        partnerId: freshPartner.id,
        channel: DeliveryChannel.realtime,
        price,
      },
    });

    await tx.partner.update({
      where: { id: freshPartner.id },
      data: { walletBalance: newBalance },
    });

    await tx.transaction.create({
      data: {
        partnerId: freshPartner.id,
        type: TransactionType.lead_purchase,
        amount: -price,
        balanceAfter: newBalance,
        leadDeliveryId: delivery.id,
        description: `Realtime lead purchase: ${freshLead.state}`,
      },
    });

    const updatedLead = await tx.lead.update({
      where: { id: freshLead.id },
      data: {
        available: false,
        status: LeadStatus.delivered,
      },
    });

    return {
      lead: updatedLead,
      partner: freshPartner,
      deliveryId: delivery.id,
    };
  });

  if (!result) {
    return {
      matched: false,
      lead,
      reason: "Match failed during transaction (concurrency or insufficient balance)",
    };
  }

  if (process.env.INTEGRATIONS_MODE === "mock") {
    console.info(
      `[mock] Lead ${result.lead.id} delivered to partner ${result.partner.email}`,
    );
  }

  return {
    matched: true,
    lead: result.lead,
    partner: result.partner,
    deliveryId: result.deliveryId,
  };
}
