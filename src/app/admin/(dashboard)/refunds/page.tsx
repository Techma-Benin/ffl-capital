import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminRefundsPendingTable } from "@/components/admin/admin-refunds-pending-table";
import { AdminRefundsHistoryTable } from "@/components/admin/admin-refunds-history-table";
import { ArrowCounterClockwise, Clock, Funnel, Phone } from "@/lib/icons/ssr";
import { StatCard } from "@/components/ui/stat-card";

export default async function AdminRefundsPage() {
  const [pending, history] = await Promise.all([
    prisma.refundRequest.findMany({
      where: { status: "pending" },
      include: { leadDelivery: { include: { lead: true } }, partner: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.refundRequest.findMany({
      where: { status: { not: "pending" } },
      include: { leadDelivery: { include: { lead: true } }, partner: true },
      orderBy: { reviewedAt: "desc" },
      take: 30,
    }),
  ]);

  const typeACount = pending.filter((r) => r.refundType === "wrong_filter").length;
  const typeBCount = pending.filter((r) => r.refundType === "invalid_phone").length;

  return (
    <div>
      <PageHeader
        title="Refunds"
        subtitle="Review and approve partner refund requests"
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending" value={pending.length} icon={Clock} accent="orange" />
        <StatCard label="Wrong Filter" value={typeACount} icon={Funnel} accent="amber" valueClassName="text-amber-700" />
        <StatCard label="Invalid Phone" value={typeBCount} icon={Phone} accent="pink" valueClassName="text-red-600" />
      </div>

      <div className="card mb-6">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Pending Requests</h2>
        </div>

        <div className="overflow-x-auto">
          {pending.length === 0 ? (
            <EmptyState
              icon={ArrowCounterClockwise}
              title="No pending refund requests"
              description="Refund requests from partners will appear here for review."
              accent="orange"
            />
          ) : (
            <AdminRefundsPendingTable
              refunds={pending.map((r) => ({
                id: r.id,
                partnerName: `${r.partner.firstName} ${r.partner.lastName}`,
                partnerEmail: r.partner.email,
                leadName: `${r.leadDelivery.lead.firstName} ${r.leadDelivery.lead.lastName}`,
                state: r.leadDelivery.lead.state,
                refundType: r.refundType,
                reason: r.reason,
                amount: Number(r.leadDelivery.price),
                createdAt: r.createdAt.toISOString(),
              }))}
            />
          )}
        </div>
      </div>

      {history.length > 0 && (
        <div className="card">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Recent History</h2>
          </div>
          <div className="overflow-x-auto">
            <AdminRefundsHistoryTable
              refunds={history.map((r) => ({
                id: r.id,
                partnerName: `${r.partner.firstName} ${r.partner.lastName}`,
                leadName: `${r.leadDelivery.lead.firstName} ${r.leadDelivery.lead.lastName}`,
                refundType: r.refundType,
                amount: Number(r.leadDelivery.price),
                status: r.status,
                reviewedAt: r.reviewedAt?.toISOString() ?? null,
              }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
