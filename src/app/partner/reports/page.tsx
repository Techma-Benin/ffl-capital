import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartBar, FileText, TrendUp, TrendDown, ArrowCounterClockwise } from "@/lib/icons/ssr";
import { StatCard } from "@/components/ui/stat-card";
import { formatDateTime } from "@/lib/format-datetime";
import { formatUsd, moneyCellClass, moneyHeaderClassName, moneyStatValueClassName } from "@/lib/format-money";
import { FUNDING_TRANSACTION_TYPES } from "@/lib/wallet/grant-partner-credits";

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

  const totalTopUp = transactions
    .filter((t) => FUNDING_TRANSACTION_TYPES.includes(t.type as typeof FUNDING_TRANSACTION_TYPES[number]))
    .reduce((s, t) => s + Number(t.amount), 0);
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
        <StatCard label="Total Funded" value={formatUsd(totalTopUp)} icon={TrendUp} accent="emerald" valueClassName={moneyStatValueClassName} />
        <StatCard label="Total on Leads" value={formatUsd(totalLeads)} icon={TrendDown} accent="brand" valueClassName={moneyStatValueClassName} />
        <StatCard
          label="Total Refunded"
          value={formatUsd(totalRefunds)}
          icon={ArrowCounterClockwise}
          accent="amber"
          valueClassName={moneyStatValueClassName}
        />
        <StatCard
          label="Leads Purchased"
          value={deliveries.length}
          icon={FileText}
          accent="violet"
          blobIndex={5}
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
              accent="violet"
            />
          ) : (
            <table className="data-table data-table-partner-transactions">
              <colgroup>
                <col />
                <col />
                <col />
                <col />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Description</th>
                  <th className={moneyHeaderClassName}>Amount</th>
                  <th className={moneyHeaderClassName}>Balance After</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => {
                  const amount = Number(t.amount);
                  const isCredit = amount > 0;
                  const typeMap: Record<string, { variant: "green" | "blue" | "yellow" | "slate"; label: string }> = {
                    top_up:        { variant: "green",  label: "Top-up" },
                    admin_grant:   { variant: "green",  label: "Admin Credit" },
                    lead_purchase: { variant: "blue",   label: "Lead Purchase" },
                    aged_purchase: { variant: "blue",   label: "Aged Purchase" },
                    refund:        { variant: "yellow", label: "Refund" },
                    reprocessing_fee: { variant: "slate", label: "Reprocess Fee" },
                  };
                  const typeConfig = typeMap[t.type] ?? { variant: "slate" as const, label: t.type };

                  return (
                    <tr key={t.id}>
                      <td><Badge variant={typeConfig.variant}>{typeConfig.label}</Badge></td>
                      <td className="truncate text-slate-500" title={t.description ?? undefined}>
                        {t.description ?? "—"}
                      </td>
                      <td className={moneyCellClass()}>
                        <span className={`font-semibold ${isCredit ? "text-emerald-600" : "text-red-600"}`}>
                          {isCredit ? "+" : ""}
                          {formatUsd(Math.abs(amount))}
                        </span>
                      </td>
                      <td className={moneyCellClass("font-medium")}>{formatUsd(t.balanceAfter)}</td>
                      <td className="text-xs text-slate-400" suppressHydrationWarning>
                        {formatDateTime(t.createdAt)}
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
