import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { RotateCcw, CheckCircle, XCircle } from "lucide-react";

export default async function AdminRefundsPage() {
  const [pending, history] = await Promise.all([
    prisma.refundRequest.findMany({
      where:   { status: "pending" },
      include: { leadDelivery: { include: { lead: true } }, partner: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.refundRequest.findMany({
      where:   { status: { not: "pending" } },
      include: { leadDelivery: { include: { lead: true } }, partner: true },
      orderBy: { reviewedAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Refunds"
        subtitle="Review and approve partner refund requests"
      />

      {/* Pending queue */}
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
              icon={RotateCcw}
              title="No pending refund requests"
              description="Refund requests from partners will appear here for review."
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Partner</th>
                  <th>Lead</th>
                  <th>State</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Amount</th>
                  <th>Requested</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div>
                        <p className="font-medium text-slate-900">
                          {r.partner.firstName} {r.partner.lastName}
                        </p>
                        <p className="text-xs text-slate-400">{r.partner.email}</p>
                      </div>
                    </td>
                    <td>
                      <p className="font-medium text-slate-900">
                        {r.leadDelivery.lead.firstName} {r.leadDelivery.lead.lastName}
                      </p>
                    </td>
                    <td>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">
                        {r.leadDelivery.lead.state}
                      </span>
                    </td>
                    <td>
                      <RefundTypeBadge type={r.refundType} />
                    </td>
                    <td className="text-slate-500 max-w-[180px] truncate">
                      {r.reason ?? "—"}
                    </td>
                    <td className="font-semibold text-slate-900">
                      ${Number(r.leadDelivery.price).toFixed(2)}
                    </td>
                    <td className="text-xs text-slate-400">
                      {new Date(r.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <button className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors">
                          <CheckCircle size={12} />
                          Approve
                        </button>
                        <button className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors">
                          <XCircle size={12} />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* History */}
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
    return <Badge variant="yellow">Type A — Wrong Filter</Badge>;
  }
  return <Badge variant="red">Type B — Invalid Phone</Badge>;
}
