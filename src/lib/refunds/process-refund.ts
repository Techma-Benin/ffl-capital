import { LeadEventType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PRISMA_TX_OPTIONS } from "@/lib/db-transaction";
import { emitLeadEvent } from "@/lib/leads/lead-events";
import { creditWallet } from "@/lib/wallet/ledger";
import { matchLead } from "@/lib/matching/engine";
import { deliverLead } from "@/lib/delivery/deliver-lead";

export async function processRefundApproval(
  refundRequestId: string,
  reviewerPartnerId?: string,
) {
  const request = await prisma.refundRequest.findUnique({
    where: { id: refundRequestId },
    include: {
      leadDelivery: { include: { lead: true } },
      partner: true,
    },
  });

  if (!request) throw new Error("Refund request not found");
  if (request.status !== "pending") throw new Error("Refund already reviewed");

  const { leadDelivery, partner } = request;
  const price = Number(leadDelivery.price);

  await prisma.$transaction(async (tx) => {
    await tx.refundRequest.update({
      where: { id: refundRequestId },
      data: {
        status: "approved",
        reviewedAt: new Date(),
        reviewedById: reviewerPartnerId ?? null,
      },
    });

    await tx.leadDelivery.update({
      where: { id: leadDelivery.id },
      data: { refundedAt: new Date() },
    });

    if (request.refundType === "invalid_phone") {
      await tx.lead.update({
        where: { id: leadDelivery.leadId },
        data: { available: false, status: "dead" },
      });
    } else {
      await tx.lead.update({
        where: { id: leadDelivery.leadId },
        data: { available: true, status: "unmatched" },
      });
    }
  }, PRISMA_TX_OPTIONS);

  await creditWallet(partner.id, price, "refund", {
    leadDeliveryId: leadDelivery.id,
    description: `Refund approved: ${request.refundType}`,
  });

  await emitLeadEvent(leadDelivery.leadId, LeadEventType.refunded, {
    refundRequestId,
    refundType: request.refundType,
    partnerId: partner.id,
    amount: price,
  });

  return { refundRequestId, status: "approved" as const };
}

export async function processRefundRejection(
  refundRequestId: string,
  reviewerPartnerId?: string,
) {
  const request = await prisma.refundRequest.findUnique({
    where: { id: refundRequestId },
  });
  if (!request) throw new Error("Refund request not found");
  if (request.status !== "pending") throw new Error("Refund already reviewed");

  await prisma.refundRequest.update({
    where: { id: refundRequestId },
    data: {
      status: "rejected",
      reviewedAt: new Date(),
      reviewedById: reviewerPartnerId ?? null,
    },
  });

  return { refundRequestId, status: "rejected" as const };
}
