import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminRefundsPendingTable } from "@/components/admin/admin-refunds-pending-table";
import { ArrowCounterClockwise } from "@/lib/icons/ssr";

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

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="stat-card-orange">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{pending.length}</p>
        </div>
        <div className="stat-card-yellow">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Wrong Filter</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{typeACount}</p>
        </div>
        <div className="stat-card-pink">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Invalid Phone</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{typeBCount}</p>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Pending Requests</h2>
            {pending.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                {pending.length}
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {pending.length === 0 ? (
            <EmptyState
              icon={ArrowCounterClockwise}
              title="No pending refund requests"
              description="Refund requests from partners will appear here for review."
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
            <table className="data-table">
              <thead>
                <tr>
                  <th>Partner</th>
                  <th>Lead</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Decision</th>
                  <th>Reviewed</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium text-slate-900">
                      {r.partner.firstName} {r.partner.lastName}
                    </td>
                    <td>
                      {r.leadDelivery.lead.firstName} {r.leadDelivery.lead.lastName}
                    </td>
                    <td>
                      <RefundTypeBadge type={r.refundType} />
                    </td>
                    <td className="font-semibold">${Number(r.leadDelivery.price).toFixed(2)}</td>
                    <td>
                      <Badge variant={r.status === "approved" ? "green" : "red"}>
                        {r.status === "approved" ? "Approved" : "Rejected"}
                      </Badge>
                    </td>
                    <td className="text-xs text-slate-400">
                      {r.reviewedAt
                        ? new Date(r.reviewedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function RefundTypeBadge({ type }: { type: string }) {
  if (type === "wrong_filter") {
    return <Badge variant="yellow">Wrong Filter</Badge>;
  }
  return <Badge variant="red">Invalid Phone</Badge>;
}
