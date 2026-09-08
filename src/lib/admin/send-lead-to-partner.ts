import {
  DeliveryChannel,
  LeadCategoryResolution,
  LeadEventType,
  LeadStatus,
  PartnerStatus,
  TransactionType,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { PRISMA_TX_OPTIONS } from "@/lib/db-transaction";
import { deliverLead } from "@/lib/delivery/deliver-lead";
import { emitLeadEvent } from "@/lib/leads/lead-events";
import {
  DEFAULT_MAX_REALTIME_SELLS,
  countNonRefundedRealtimeSales,
  evaluateRealtimeSaleGuard,
  partnerOwnsNonRefundedRealtimeSale,
} from "@/lib/leads/realtime-sale-cap";
import { claimLiveSale } from "@/lib/lead-routing/live-sale";
import {
  getEffectivePrice,
  isFilterSetEligibleForLead,
} from "@/lib/matching/eligibility";
import { getDefaultRealtimePrice } from "@/lib/settings/app-settings";
import { debitWallet } from "@/lib/wallet/ledger";

export class SendLeadToPartnerError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "not_found"
      | "partner_inactive"
      | "dead"
      | "review"
      | "unclassified"
      | "already_sold"
      | "sale_cap"
      | "no_filter_match"
      | "insufficient_balance",
  ) {
    super(message);
    this.name = "SendLeadToPartnerError";
  }
}

export type SendLeadToPartnerResult = {
  leadId: string;
  ok: boolean;
  deliveryId?: string;
  error?: string;
  code?: string;
};

export async function sendLeadsToPartner(
  leadIds: string[],
  partnerId: string,
): Promise<{
  sent: number;
  failed: number;
  results: SendLeadToPartnerResult[];
}> {
  const uniqueIds = [...new Set(leadIds)];
  const results: SendLeadToPartnerResult[] = [];

  for (const leadId of uniqueIds) {
    try {
      const deliveryId = await sendLeadToPartner(leadId, partnerId);
      results.push({ leadId, ok: true, deliveryId });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not send this lead";
      const code =
        err instanceof SendLeadToPartnerError ? err.code : undefined;
      results.push({ leadId, ok: false, error: message, code });
    }
  }

  return {
    sent: results.filter((row) => row.ok).length,
    failed: results.filter((row) => !row.ok).length,
    results,
  };
}

export async function sendLeadToPartner(
  leadId: string,
  partnerId: string,
): Promise<string> {
  const [lead, partner, defaultPrice] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        leadDeliveries: {
          select: {
            partnerId: true,
            channel: true,
            refundedAt: true,
          },
        },
      },
    }),
    prisma.partner.findUnique({
      where: { id: partnerId },
      include: {
        filterSets: {
          where: { active: true, isTemplate: false },
        },
      },
    }),
    getDefaultRealtimePrice(),
  ]);

  if (!lead) {
    throw new SendLeadToPartnerError("Lead not found", "not_found");
  }
  if (!partner) {
    throw new SendLeadToPartnerError("Partner not found", "not_found");
  }
  if (partner.status !== PartnerStatus.active) {
    throw new SendLeadToPartnerError(
      "Partner is not active",
      "partner_inactive",
    );
  }

  const category = lead.leadType
    ? await prisma.leadCategory.findUnique({
        where: { type: lead.leadType },
        select: { maxRealtimeSells: true, enabled: true },
      })
    : null;

  const maxRealtimeSells =
    category?.maxRealtimeSells ?? DEFAULT_MAX_REALTIME_SELLS;
  const soldCount = countNonRefundedRealtimeSales(lead.leadDeliveries);
  const alreadySoldToPartner = partnerOwnsNonRefundedRealtimeSale(
    lead.leadDeliveries,
    partnerId,
  );

  const guard = evaluateRealtimeSaleGuard({
    status: lead.status,
    leadType: lead.leadType,
    categoryResolution: lead.categoryResolution,
    maxRealtimeSells,
    soldCount,
    alreadySoldToPartner,
  });
  if (!guard.ok) {
    throw new SendLeadToPartnerError(
      guard.message,
      guard.code as SendLeadToPartnerError["code"],
    );
  }

  if (category && !category.enabled) {
    throw new SendLeadToPartnerError(
      "This lead category is inactive",
      "unclassified",
    );
  }

  const leadType = lead.leadType ?? "";
  const filterMatches = partner.filterSets
    .map((filterSet) => ({
      filterSet,
      effectivePrice: getEffectivePrice(filterSet, defaultPrice),
    }))
    .filter(({ filterSet, effectivePrice }) =>
      isFilterSetEligibleForLead(
        filterSet,
        partner,
        lead.state,
        leadType,
        effectivePrice,
        lead,
        false,
      ),
    )
    .sort((a, b) => {
      if (b.filterSet.priority !== a.filterSet.priority) {
        return b.filterSet.priority - a.filterSet.priority;
      }
      return a.filterSet.createdAt.getTime() - b.filterSet.createdAt.getTime();
    });

  if (filterMatches.length === 0) {
    throw new SendLeadToPartnerError(
      "Partner does not match this lead's filters",
      "no_filter_match",
    );
  }

  const affordable = filterMatches.filter(
    ({ effectivePrice }) => Number(partner.walletBalance) >= effectivePrice,
  );
  const winner = affordable[0];
  if (!winner) {
    throw new SendLeadToPartnerError(
      "Partner does not have enough wallet balance",
      "insufficient_balance",
    );
  }

  const price = winner.effectivePrice;

  const result = await prisma.$transaction(async (tx) => {
    const freshLead = await tx.lead.findUniqueOrThrow({
      where: { id: leadId },
      include: {
        leadDeliveries: {
          select: {
            partnerId: true,
            channel: true,
            refundedAt: true,
          },
        },
      },
    });
    const freshPartner = await tx.partner.findUniqueOrThrow({
      where: { id: partnerId },
    });

    const freshSold = countNonRefundedRealtimeSales(freshLead.leadDeliveries);
    const freshOwns = partnerOwnsNonRefundedRealtimeSale(
      freshLead.leadDeliveries,
      partnerId,
    );
    const freshGuard = evaluateRealtimeSaleGuard({
      status: freshLead.status,
      leadType: freshLead.leadType,
      categoryResolution: freshLead.categoryResolution,
      maxRealtimeSells,
      soldCount: freshSold,
      alreadySoldToPartner: freshOwns,
    });
    if (!freshGuard.ok) {
      throw new SendLeadToPartnerError(
        freshGuard.message,
        freshGuard.code as SendLeadToPartnerError["code"],
      );
    }

    if (Number(freshPartner.walletBalance) < price) {
      throw new SendLeadToPartnerError(
        "Partner does not have enough wallet balance",
        "insufficient_balance",
      );
    }

    const delivery = await tx.leadDelivery.create({
      data: {
        leadId: freshLead.id,
        partnerId: freshPartner.id,
        filterSetId: winner.filterSet.id,
        channel: DeliveryChannel.realtime,
        price,
      },
    });

    await debitWallet(freshPartner.id, price, TransactionType.lead_purchase, {
      tx,
      leadDeliveryId: delivery.id,
      description: `Admin send to partner: ${freshLead.state}`,
    });

    await tx.lead.update({
      where: { id: freshLead.id },
      data: {
        available: false,
        status: LeadStatus.delivered,
        categoryResolution: LeadCategoryResolution.matched,
      },
    });

    await emitLeadEvent(
      freshLead.id,
      LeadEventType.matched,
      {
        partnerId: freshPartner.id,
        filterSetId: winner.filterSet.id,
        price,
        deliveryId: delivery.id,
        adminForced: true,
      },
      undefined,
      tx,
    );

    return delivery.id;
  }, PRISMA_TX_OPTIONS);

  await claimLiveSale(leadId, "partner");
  await deliverLead(result);
  return result;
}
