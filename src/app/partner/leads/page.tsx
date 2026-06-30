import { getCurrentPartner } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText, ShieldCheck, RotateCcw } from "lucide-react";

export default async function PartnerLeadsPage() {
  const partner = await getCurrentPartner();
  if (!partner) return null;

  const deliveries = await prisma.leadDelivery.findMany({
    where:   { partnerId: partner.id },
    include: { lead: true, refundRequests: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { deliveredAt: "desc" },
    take: 100,
  });

  const totalSpent = deliveries.reduce((sum, d) => sum + Number(d.price), 0);
  const refundedCount = deliveries.filter(d => d.refundedAt).length;

  return (
    <div>
      <PageHeader
        title="My Leads"
        subtitle="All leads delivered to your account"
      />

      {/* Summary row */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total Delivered",  value: deliveries.length,              color: "text-slate-900" },
          { label: "Total Spent",      value: `$${totalSpent.toFixed(2)}`,    color: "text-brand-700" },
          { label: "Refunded",         value: refundedCount,                  color: "text-amber-600" },
        ].map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{c.label}</p>
            <p className={`mt-1 text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          {deliveries.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No leads delivered yet"
              description="Once your account is active and funded, leads matching your states will be delivered automatically."
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Contact</th>
                  <th>State</th>
                  <th>Type</th>
                  <th>Channel</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>TrustedForm</th>
                  <th>Delivered</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => {
                  const refundReq = d.refundRequests[0];
                  const isRefunded = !!d.refundedAt;
                  const canRefund = d.lead.refundable && !isRefunded && !refundReq;

                  return (
                    <tr key={d.id}>
                      <td>
                        <p className="font-medium text-slate-900">
                          {d.lead.firstName} {d.lead.lastName}
                        </p>
                        <p className="text-xs text-slate-400">{d.lead.email}</p>
                      </td>
                      <td className="text-slate-500">{d.lead.phone}</td>
                      <td>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">
                          {d.lead.state}
                        </span>
                      </td>
                      <td>
                        <Badge variant="blue">
                          {d.lead.leadType === "traditional_iul" ? "Trad. IUL" : "High Intent"}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={d.channel === "realtime" ? "green" : "purple"}>
                          {d.channel === "realtime" ? "Real-time" : "Aged"}
                        </Badge>
                      </td>
                      <td className="font-semibold text-slate-900">${Number(d.price).toFixed(2)}</td>
                      <td>
                        {isRefunded ? (
                          <Badge variant="slate">Refunded</Badge>
                        ) : refundReq ? (
                          <Badge variant="yellow">
                            Refund {refundReq.status === "pending" ? "Pending" : refundReq.status}
                          </Badge>
                        ) : (
                          <Badge variant="green">Active</Badge>
                        )}
                      </td>
                      <td>
                        {d.lead.trustedformCertUrl ? (
                          <a
                            href={d.lead.trustedformCertUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                          >
                            <ShieldCheck size={12} />
                            Cert
                          </a>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="text-xs text-slate-400">
                        {new Date(d.deliveredAt).toLocaleString("en-US", {
                          month: "short",
                          day:   "numeric",
                          hour:  "2-digit",
                          minute:"2-digit",
                        })}
                      </td>
                      <td>
                        <div className="flex justify-end">
                          {canRefund && (
                            <button className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors">
                              <RotateCcw size={11} />
                              Refund
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
