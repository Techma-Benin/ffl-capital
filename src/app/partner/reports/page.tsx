import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartBar, FileText, TrendUp, TrendDown, ArrowCounterClockwise } from "@phosphor-icons/react/dist/ssr";
import { StatCard } from "@/components/ui/stat-card";

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

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Funded"
          value={`$ ${totalTopUp.toFixed(2)}`}
          variant="hero"
          icon={TrendUp}
          heroBg="bg-emerald-400"
        />
        <StatCard
          label="Total on Leads"
          value={`$ ${totalLeads.toFixed(2)}`}
          variant="hero"
          icon={TrendDown}
          heroBg="bg-brand-500"
        />
        <StatCard
          label="Total Refunded"
          value={`$ ${totalRefunds.toFixed(2)}`}
          variant="hero"
          icon={ArrowCounterClockwise}
          heroBg="bg-amber-400"
        />
        <StatCard
          label="Leads Purchased"
          value={deliveries.length}
          variant="hero"
          icon={FileText}
          heroBg="bg-violet-500"
        />
      </div>

      <div className="card">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Transaction History</h2>
        </div>
        <div className="overflow-x-auto">
          {transactions.length === 0 ? (
            <EmptyState
              icon={ChartBar}
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

    </div>
  );
}
