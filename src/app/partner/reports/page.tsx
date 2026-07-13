import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart2, FileText } from "lucide-react";

export default async function PartnerReportsPage() {
  const partnerId = await getPartnerId();
  if (!partnerId) redirect("/onboarding");

  const [transactions, deliveries] = await Promise.all([
    prisma.transaction.findMany({
      where: { partnerId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.leadDelivery.findMany({
      where: { partnerId },
      include: { lead: true, refundRequests: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { deliveredAt: "desc" },
      take: 100,
    }),
  ]);

  const totalTopUp = transactions.filter(t => t.type === "top_up").reduce((s, t) => s + Number(t.amount), 0);
  const totalLeads = transactions.filter(t => ["lead_purchase","aged_purchase"].includes(t.type)).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const totalRefunds = transactions.filter(t => t.type === "refund").reduce((s, t) => s + Number(t.amount), 0);
  const refundedCount = deliveries.filter((d) => d.refundedAt).length;

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Transaction history and account activity"
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        {[
          { label: "Total Funded",    value: `$${totalTopUp.toFixed(2)}`,   color: "text-emerald-600" },
          { label: "Total on Leads",  value: `$${totalLeads.toFixed(2)}`,   color: "text-brand-700" },
          { label: "Total Refunded",  value: `$${totalRefunds.toFixed(2)}`, color: "text-amber-600" },
          { label: "Leads Purchased", value: deliveries.length,             color: "text-slate-900" },
        ].map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{c.label}</p>
            <p className={`mt-1 text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Transaction History</h2>
        </div>
        <div className="overflow-x-auto">
          {transactions.length === 0 ? (
            <EmptyState
              icon={BarChart2}
              title="No transactions yet"
              description="Your transaction history will appear here."
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Balance After</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => {
                  const amount = Number(t.amount);
                  const isCredit = amount > 0;
                  const typeMap: Record<string, { variant: "green" | "blue" | "yellow" | "slate"; label: string }> = {
                    top_up:        { variant: "green",  label: "Top-up" },
                    lead_purchase: { variant: "blue",   label: "Lead Purchase" },
                    aged_purchase: { variant: "blue",   label: "Aged Purchase" },
                    refund:        { variant: "yellow", label: "Refund" },
                    reprocessing_fee: { variant: "slate", label: "Reprocess Fee" },
                  };
                  const typeConfig = typeMap[t.type] ?? { variant: "slate" as const, label: t.type };

                  return (
                    <tr key={t.id}>
                      <td><Badge variant={typeConfig.variant}>{typeConfig.label}</Badge></td>
                      <td className="text-slate-500">{t.description ?? "—"}</td>
                      <td>
                        <span className={`font-semibold ${isCredit ? "text-emerald-600" : "text-slate-900"}`}>
                          {isCredit ? "+" : ""}${Math.abs(amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="font-medium">${Number(t.balanceAfter).toFixed(2)}</td>
                      <td className="text-xs text-slate-400">
                        {new Date(t.createdAt).toLocaleString("en-US", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="mt-6 card">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Lead Purchase History</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {deliveries.length} delivered · {refundedCount} refunded
          </p>
        </div>
        <div className="overflow-x-auto">
          {deliveries.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No lead purchases yet"
              description="Delivered leads will appear here with pricing and status."
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>State</th>
                  <th>Type</th>
                  <th>Channel</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Delivered</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => {
                  const refundReq = d.refundRequests[0];
                  const isRefunded = !!d.refundedAt;

                  return (
                    <tr key={d.id}>
                      <td>
                        <p className="font-medium text-slate-900">
                          {d.lead.firstName} {d.lead.lastName}
                        </p>
                        <p className="text-xs text-slate-400">{d.lead.email}</p>
                      </td>
                      <td>{d.lead.state}</td>
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
                      <td className="font-semibold">${Number(d.price).toFixed(2)}</td>
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
                      <td className="text-xs text-slate-400">
                        {new Date(d.deliveredAt).toLocaleString("en-US", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
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
