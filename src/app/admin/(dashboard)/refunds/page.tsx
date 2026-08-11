import { prisma } from "@/lib/db";
import { refundLeadSnapshotFromDelivery } from "@/lib/admin/refund-lead-snapshot";
import { refundPartnerSnapshotFromRow } from "@/lib/admin/refund-partner-snapshot";
import { getClerkPartnerImageUrlMap } from "@/lib/auth/clerk-profile";
import {
  loadEnabledCategoryLabels,
  resolveLeadTypeDisplay,
} from "@/lib/lead-categories/category-labels";
import {
  AdminRefundsView,
  type AdminRefundsStorePayload,
} from "@/components/admin/admin-refunds-view";

const PARTNER_SHEET_AVATAR_PX = 48;

const refundPartnerInclude = {
  include: {
    _count: { select: { leadDeliveries: true } },
  },
} as const;

export default async function AdminRefundsPage() {
  const [pending, history, categories] = await Promise.all([
    prisma.refundRequest.findMany({
      where: { status: "pending" },
      include: {
        leadDelivery: { include: { lead: true } },
        partner: refundPartnerInclude,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.refundRequest.findMany({
      where: { status: { not: "pending" } },
      include: {
        leadDelivery: { include: { lead: true } },
        partner: refundPartnerInclude,
      },
      orderBy: { reviewedAt: "desc" },
      take: 30,
    }),
    loadEnabledCategoryLabels(),
  ]);

  const avatarByClerkId = await getClerkPartnerImageUrlMap(
    [...pending, ...history].map((r) => r.partner.clerkUserId),
    PARTNER_SHEET_AVATAR_PX,
  );

  function partnerSnapshot(
    partner: (typeof pending)[number]["partner"],
  ) {
    const avatarUrl = partner.clerkUserId
      ? (avatarByClerkId.get(partner.clerkUserId) ?? null)
      : null;
    return refundPartnerSnapshotFromRow(partner, { avatarUrl });
  }

  function leadSnapshot(
    delivery: (typeof pending)[number]["leadDelivery"],
    partner: (typeof pending)[number]["partner"],
  ) {
    const lead = delivery.lead;
    return refundLeadSnapshotFromDelivery(delivery, partner, {
      leadTypeLabel: resolveLeadTypeDisplay({
        leadType: lead.leadType,
        categoryResolution: lead.categoryResolution,
        categoryCandidateTypes: lead.categoryCandidateTypes,
        categories,
      }).label,
    });
  }

  const initial: AdminRefundsStorePayload = {
    pending: pending.map((r) => ({
      id: r.id,
      partner: partnerSnapshot(r.partner),
      lead: leadSnapshot(r.leadDelivery, r.partner),
      refundType: r.refundType,
      reason: r.reason,
      amount: Number(r.leadDelivery.price),
      createdAt: r.createdAt.toISOString(),
    })),
    history: history.map((r) => ({
      id: r.id,
      partner: partnerSnapshot(r.partner),
      lead: leadSnapshot(r.leadDelivery, r.partner),
      refundType: r.refundType,
      amount: Number(r.leadDelivery.price),
      status: r.status,
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
    })),
  };

  return <AdminRefundsView initial={initial} />;
}
