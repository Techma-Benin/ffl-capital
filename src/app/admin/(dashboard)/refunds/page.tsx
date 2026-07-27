import { prisma } from "@/lib/db";
import { refundLeadSnapshotFromDelivery } from "@/lib/admin/refund-lead-snapshot";
import { refundPartnerSnapshotFromRow } from "@/lib/admin/refund-partner-snapshot";
import {
  AdminRefundsView,
  type AdminRefundsStorePayload,
} from "@/components/admin/admin-refunds-view";

const refundPartnerInclude = {
  include: {
    _count: { select: { leadDeliveries: true } },
  },
} as const;

export default async function AdminRefundsPage() {
  const [pending, history] = await Promise.all([
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
  ]);

  function partnerSnapshot(
    partner: (typeof pending)[number]["partner"],
  ) {
    return refundPartnerSnapshotFromRow(partner, {
      avatarUrl: partner.avatarUrl,
    });
  }

  const initial: AdminRefundsStorePayload = {
    pending: pending.map((r) => ({
      id: r.id,
      partner: partnerSnapshot(r.partner),
      lead: refundLeadSnapshotFromDelivery(r.leadDelivery, r.partner),
      refundType: r.refundType,
      reason: r.reason,
      amount: Number(r.leadDelivery.price),
      createdAt: r.createdAt.toISOString(),
    })),
    history: history.map((r) => ({
      id: r.id,
      partner: partnerSnapshot(r.partner),
      lead: refundLeadSnapshotFromDelivery(r.leadDelivery, r.partner),
      refundType: r.refundType,
      amount: Number(r.leadDelivery.price),
      status: r.status,
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
    })),
  };

  return <AdminRefundsView initial={initial} />;
}
