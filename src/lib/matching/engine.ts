import {
  DeliveryChannel,
  Lead,
  LeadStatus,
  Partner,
  TransactionType,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { debitWallet } from "@/lib/wallet/ledger";
import { deliverLead } from "@/lib/delivery/deliver-lead";
import { findEligiblePartners } from "./eligibility";

export interface MatchResult {
  matched: boolean;
  lead: Lead;
  partner?: Partner;
  deliveryId?: string;
  reason?: string;
}

export async function matchLead(
  leadId: string,
  options?: { excludePartnerIds?: string[] },
): Promise<MatchResult> {
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

  const eligible = await findEligiblePartners(lead.state, lead.leadType, options);
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

    const delivery = await tx.leadDelivery.create({
      data: {
        leadId: freshLead.id,
        partnerId: freshPartner.id,
        channel: DeliveryChannel.realtime,
        price,
      },
    });

    await debitWallet(freshPartner.id, price, TransactionType.lead_purchase, {
      tx,
      leadDeliveryId: delivery.id,
      description: `Realtime lead purchase: ${freshLead.state}`,
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

  try {
    await deliverLead(result.deliveryId);
  } catch (err) {
    console.error(
      `[matchLead] deliverLead failed for ${result.deliveryId}:`,
      err,
    );
  }

  return {
    matched: true,
    lead: result.lead,
    partner: result.partner,
    deliveryId: result.deliveryId,
  };
}
