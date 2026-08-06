import {
  DeliveryChannel,
  Lead,
  LeadCategoryResolution,
  LeadEventType,
  LeadStatus,
  Partner,
  TransactionType,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { PRISMA_TX_OPTIONS } from "@/lib/db-transaction";
import { emitLeadEvent } from "@/lib/leads/lead-events";
import { debitWallet } from "@/lib/wallet/ledger";
import { deliverLead } from "@/lib/delivery/deliver-lead";
import { findEligibleFilterSets } from "./eligibility";
import { claimLiveSale } from "@/lib/lead-routing/live-sale";

export interface MatchResult {
  matched: boolean;
  lead: Lead;
  partner?: Partner;
  deliveryId?: string;
  filterSetId?: string;
  reason?: string;
}

export async function matchLead(
  leadId: string,
  options?: { excludePartnerIds?: string[]; includePartnerIds?: string[] },
): Promise<MatchResult> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }

  if (
    !lead.available ||
    lead.status !== LeadStatus.unmatched ||
    lead.categoryResolution !== LeadCategoryResolution.matched ||
    !lead.leadType
  ) {
    return {
      matched: false,
      lead,
      reason: "Lead is not available for realtime matching",
    };
  }

  const eligible = await findEligibleFilterSets(
    lead.state,
    lead.leadType,
    { ...options, lead },
  );
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

    if (
      !freshLead.available ||
      freshLead.status !== LeadStatus.unmatched ||
      freshLead.categoryResolution !== LeadCategoryResolution.matched ||
      !freshLead.leadType
    ) {
      return null;
    }

    const partnerId = winner.partnerId ?? winner.partner.id;
    const freshPartner = await tx.partner.findUniqueOrThrow({
      where: { id: partnerId },
    });

    const price = winner.effectivePrice;
    if (Number(freshPartner.walletBalance) < price) {
      return null;
    }

    const delivery = await tx.leadDelivery.create({
      data: {
        leadId: freshLead.id,
        partnerId: freshPartner.id,
        filterSetId: winner.id,
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

    await emitLeadEvent(
      freshLead.id,
      LeadEventType.matched,
      {
        partnerId: freshPartner.id,
        filterSetId: winner.id,
        price,
        deliveryId: delivery.id,
      },
      undefined,
      tx,
    );

    return {
      lead: updatedLead,
      partner: freshPartner,
      deliveryId: delivery.id,
      filterSetId: winner.id,
    };
  }, PRISMA_TX_OPTIONS);

  if (!result) {
    return {
      matched: false,
      lead,
      reason: "Match failed during transaction (concurrency or insufficient balance)",
    };
  }

  await claimLiveSale(result.lead.id, "partner");

  try {
    await deliverLead(result.deliveryId);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await emitLeadEvent(result.lead.id, LeadEventType.delivery_failed, {
      step: "deliver_lead_threw",
      deliveryId: result.deliveryId,
      error: errMsg,
      errorDetail: err instanceof Error ? { name: err.name, message: err.message } : String(err),
    });
  }

  return {
    matched: true,
    lead: result.lead,
    partner: result.partner,
    deliveryId: result.deliveryId,
    filterSetId: result.filterSetId,
  };
}
