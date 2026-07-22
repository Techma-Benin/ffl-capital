import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getLeadEvents } from "@/lib/leads/lead-events";
import { refundPartnerSnapshotFromRow } from "@/lib/admin/refund-partner-snapshot";
import { getClerkPartnerImageUrlMap } from "@/lib/auth/clerk-profile";
import { formatUsd } from "@/lib/format-money";

const PARTNER_SHEET_AVATAR_PX = 48;
import {
  AdminLeadDetailView,
  type AdminLeadDetailDelivery,
  type AdminLeadDetailEvent,
  type AdminLeadDetailTimelineItem,
} from "@/components/admin/admin-lead-detail-view";

export default async function AdminLeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      leadDeliveries: {
        include: {
          partner: {
            include: { _count: { select: { leadDeliveries: true } } },
          },
          refundRequests: true,
        },
        orderBy: { deliveredAt: "desc" },
      },
      resalePostings: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!lead) notFound();

  const leadEvents = await getLeadEvents(params.id);

  const timeline: AdminLeadDetailTimelineItem[] = [
    {
      at: lead.receivedAt.toISOString(),
      label: "Lead received",
      detail: `Source: ${lead.source}`,
    },
    ...lead.leadDeliveries.map((d) => ({
      at: d.deliveredAt.toISOString(),
      label: `Delivered (${d.channel})`,
      detail: `${d.partner.firstName} ${d.partner.lastName} — ${formatUsd(d.price)}`,
    })),
    ...lead.leadDeliveries.flatMap((d) =>
      d.refundRequests.map((r) => ({
        at: r.createdAt.toISOString(),
        label: `Refund ${r.status}`,
        detail: `${r.refundType}${r.reason ? ` — ${r.reason}` : ""}`,
      })),
    ),
    ...lead.resalePostings.map((p) => ({
      at: (p.postedAt ?? p.createdAt).toISOString(),
      label: `Integrity ${p.status}`,
      detail: p.externalRef ?? p.mode,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const leadTypeLabel =
    lead.leadType === "traditional_iul" ? "Traditional IUL" : "High Intent IUL";

  const latestDelivery = lead.leadDeliveries[0];
  const canRedeliver = lead.leadDeliveries.length > 0;
  const refundableDelivery = lead.leadDeliveries.find((d) => !d.refundedAt);

  const avatarByClerkId = await getClerkPartnerImageUrlMap(
    lead.leadDeliveries.map((d) => d.partner.clerkUserId),
    PARTNER_SHEET_AVATAR_PX,
  );

  const deliveries: AdminLeadDetailDelivery[] = lead.leadDeliveries.map((d) => {
    const avatarUrl = d.partner.clerkUserId
      ? (avatarByClerkId.get(d.partner.clerkUserId) ?? null)
      : null;
    const partner = refundPartnerSnapshotFromRow(d.partner, { avatarUrl });
    return {
      id: d.id,
      channel: d.channel,
      price: Number(d.price),
      deliveredAt: d.deliveredAt.toISOString(),
      refundedAt: d.refundedAt?.toISOString() ?? null,
      partnerId: d.partnerId,
      partnerName: partner.name,
      partner,
    };
  });

  const grossSold = deliveries.reduce((sum, d) => sum + d.price, 0);

  const events: AdminLeadDetailEvent[] = leadEvents.map((event) => ({
    id: event.id,
    type: event.type,
    payload:
      event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
        ? (event.payload as Record<string, unknown>)
        : null,
    createdAt: event.createdAt.toISOString(),
  }));

  return (
    <AdminLeadDetailView
      lead={{
        id: lead.id,
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
        status: lead.status,
        available: lead.available,
        refundable: lead.refundable,
        leadType: lead.leadType,
        leadTypeLabel,
        intent: lead.intent,
        haveIul: lead.haveIul,
        primaryGoal: lead.primaryGoal,
        stateYouCurrentlyLiveIn: lead.stateYouCurrentlyLiveIn,
        boberdooLeadType: lead.boberdooLeadType,
        receivedAt: lead.receivedAt.toISOString(),
        trustedformCertUrl: lead.trustedformCertUrl,
        tcpaConsent: lead.tcpaConsent,
        tcpaLanguage: lead.tcpaLanguage,
        leadidToken: lead.leadidToken,
        source: lead.source,
        landingPage: lead.landingPage,
        subId: lead.subId,
        pubId: lead.pubId,
        externalId: lead.externalId,
        ipAddress: lead.ipAddress,
        userAgent: lead.userAgent,
        rawPayload: lead.rawPayload,
      }}
      deliveries={deliveries}
      timeline={timeline}
      events={events}
      grossSold={grossSold}
      actions={{
        showReprocess: lead.status === "unmatched" && lead.available,
        showRedeliver: canRedeliver,
        excludePartnerId: latestDelivery?.partnerId,
        refundableDeliveryId: refundableDelivery?.id,
        showDead: lead.status !== "dead",
        editInitial: {
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          address: lead.address,
          city: lead.city,
          state: lead.state,
          zip: lead.zip,
          intent: lead.intent,
          haveIul: lead.haveIul,
          primaryGoal: lead.primaryGoal,
        },
      }}
    />
  );
}
