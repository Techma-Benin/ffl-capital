import { getCurrentPartner } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, RefreshCw } from "lucide-react";

export default async function PartnerWalletPage() {
  const partner = await getCurrentPartner();
  if (!partner) return null;

  const balance = Number(partner.walletBalance);

  const transactions = await prisma.transaction.findMany({
    where:   { partnerId: partner.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const totalTopUp = transactions
    .filter(t => t.type === "top_up")
    .reduce((s, t) => s + Number(t.amount), 0);

  const totalSpent = transactions
    .filter(t => ["lead_purchase", "aged_purchase"].includes(t.type))
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

  return (
    <div>
      <PageHeader
        title="Wallet"
        subtitle="Manage your balance and view transaction history"
      />

      {/* Balance + quick stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-6 sm:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current Balance</p>
              <p className={`mt-2 text-4xl font-bold tracking-tight ${balance < 25 ? "text-red-600" : "text-slate-900"}`}>
                ${balance.toFixed(2)}
              </p>
              {balance < 25 && (
                <p className="mt-1 text-xs text-red-500">Below minimum — add funds to receive leads</p>
              )}
              {balance >= 25 && (
                <p className="mt-1 text-xs text-emerald-600">● Lead buying active</p>
              )}
            </div>
            <div className="rounded-xl bg-brand-50 p-3">
              <Wallet size={22} className="text-brand-600" />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Funded</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">${totalTopUp.toFixed(2)}</p>
          <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
            <TrendingUp size={11} /> All-time top-ups
          </p>
        </div>

        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Spent</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">${totalSpent.toFixed(2)}</p>
          <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
            <TrendingDown size={11} /> Lead purchases
          </p>
        </div>
      </div>

      {/* Add funds panel */}
      <div className="card mb-6 p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Add Funds</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {/* One-time top-up */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpRight size={16} className="text-brand-600" />
              <h3 className="text-sm font-semibold text-slate-900">One-Time Top-Up</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Add any amount to your wallet instantly via Stripe.
            </p>
            <div className="flex gap-2 mb-3">
              {[100, 250, 500, 1000].map((amount) => (
                <button
                  key={amount}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                >
                  ${amount}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Custom amount"
                className="form-input flex-1"
              />
              <button className="btn-primary whitespace-nowrap">
                Pay with Stripe →
              </button>
            </div>
          </div>

          {/* Weekly auto-recharge */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw size={16} className="text-violet-600" />
              <h3 className="text-sm font-semibold text-slate-900">Weekly Auto-Recharge</h3>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                Phase 3
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Automatically top up your wallet every week to stay active.
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Weekly amount (e.g. 500)"
                className="form-input flex-1"
                disabled
              />
              <button className="btn-secondary opacity-50 cursor-not-allowed" disabled>
                Coming soon
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div className="card">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Transaction History</h2>
        </div>
        <div className="overflow-x-auto">
          {transactions.length === 0 ? (
            <div className="empty-state">
              <Wallet size={28} className="mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">No transactions yet</p>
            </div>
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
                  return (
                    <tr key={t.id}>
                      <td>
                        <TransactionTypeBadge type={t.type} />
                      </td>
                      <td className="text-slate-500 text-sm">
                        {t.description ?? "—"}
                      </td>
                      <td>
                        <span
                          className={`font-semibold ${
                            isCredit ? "text-emerald-600" : "text-slate-900"
                          }`}
                        >
                          {isCredit ? "+" : ""}${Math.abs(amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="font-medium text-slate-700">
                        ${Number(t.balanceAfter).toFixed(2)}
                      </td>
                      <td className="text-xs text-slate-400">
                        {new Date(t.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day:   "numeric",
                          hour:  "2-digit",
                          minute:"2-digit",
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

function TransactionTypeBadge({ type }: { type: string }) {
  const map: Record<string, { variant: "green" | "yellow" | "blue" | "slate" | "red"; label: string }> = {
    top_up:           { variant: "green",  label: "Top-up" },
    lead_purchase:    { variant: "blue",   label: "Lead Purchase" },
    aged_purchase:    { variant: "blue",   label: "Aged Purchase" },
    refund:           { variant: "yellow", label: "Refund" },
    reprocessing_fee: { variant: "slate",  label: "Reprocess Fee" },
  };
  const c = map[type] ?? { variant: "slate" as const, label: type };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
