import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import { PartnerLeadDetailView } from "@/components/partner/partner-lead-detail-view";
import type { LeadDetailTimelineItem } from "@/components/leads/lead-detail-types";
import type { LeadDetailPurchaseInfo } from "@/components/leads/lead-detail-panels";
import { formatDateTimeLong } from "@/lib/format-datetime";
import { formatUsd } from "@/lib/format-money";

export default async function PartnerLeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const partnerId = await getPartnerId();
  if (!partnerId) redirect("/onboarding");

  const delivery = await prisma.leadDelivery.findUnique({
    where: { id: params.id },
    include: {
      lead: true,
      refundRequests: { orderBy: { createdAt: "desc" }, take: 1 },
      filterSet: { select: { name: true } },
    },
  });

  if (!delivery || delivery.partnerId !== partnerId) notFound();

  const lead = delivery.lead;
  const refundReq = delivery.refundRequests[0] ?? null;
  const isRefunded = !!delivery.refundedAt;
  const canRefund = lead.refundable && !isRefunded && !refundReq;

  const leadTypeLabel =
    lead.leadType === "traditional_iul" ? "Traditional IUL" : "High Intent IUL";
  const channelLabel = delivery.channel === "realtime" ? "Real-time" : "Aged";

  const timeline: LeadDetailTimelineItem[] = [
    {
      at: lead.receivedAt.toISOString(),
      label: "Lead received",
      detail: lead.source ? `Source: ${lead.source}` : "Lead ingested",
    },
    {
      at: delivery.deliveredAt.toISOString(),
      label: `Delivered (${delivery.channel})`,
      detail: `${channelLabel} · ${formatUsd(delivery.price)}`,
    },
    ...(refundReq
      ? [
          {
            at: refundReq.createdAt.toISOString(),
            label: `Refund ${refundReq.status}`,
            detail:
              refundReq.refundType === "wrong_filter"
                ? "Wrong filter"
                : "Invalid phone",
          },
        ]
      : []),
    ...(delivery.refundedAt
      ? [
          {
            at: delivery.refundedAt.toISOString(),
            label: "Refunded",
            detail: "Delivery marked refunded",
          },
        ]
      : []),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const purchase: LeadDetailPurchaseInfo = {
    channelLabel,
    priceLabel: formatUsd(delivery.price),
    filterSetName: delivery.filterSet?.name ?? null,
    deliveredLabel: formatDateTimeLong(delivery.deliveredAt),
    refundedLabel: isRefunded
      ? formatDateTimeLong(delivery.refundedAt)
      : null,
    refundTypeLabel:
      refundReq && !isRefunded
        ? refundReq.refundType === "wrong_filter"
          ? "Wrong Filter"
          : "Invalid Phone"
        : null,
    refundStatusLabel:
      refundReq && !isRefunded
        ? refundReq.status.charAt(0).toUpperCase() + refundReq.status.slice(1)
        : null,
    refundRequestedLabel:
      refundReq && !isRefunded
        ? formatDateTimeLong(refundReq.createdAt)
        : null,
  };

  return (
    <PartnerLeadDetailView
      lead={{
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        zip: lead.zip,
        dob: lead.dob,
        age: lead.age,
        leadTypeLabel,
        intent: lead.intent,
        haveIul: lead.haveIul,
        primaryGoal: lead.primaryGoal,
        stateYouCurrentlyLiveIn: lead.stateYouCurrentlyLiveIn,
        receivedAt: lead.receivedAt.toISOString(),
        trustedformCertUrl: lead.trustedformCertUrl,
        tcpaConsent: lead.tcpaConsent,
        tcpaLanguage: lead.tcpaLanguage,
      }}
      timeline={timeline}
      purchase={purchase}
      deliveredAt={delivery.deliveredAt.toISOString()}
      channel={delivery.channel}
      deliveryId={delivery.id}
      canRefund={canRefund}
      isRefunded={isRefunded}
      refundStatus={refundReq?.status ?? null}
      refundable={lead.refundable}
      trustedFormCertified={lead.trustedformValid}
    />
  );
}
