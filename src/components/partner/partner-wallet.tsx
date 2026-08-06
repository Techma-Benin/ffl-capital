"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { usePartner } from "@/components/partner/partner-provider";
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, RefreshCw } from "lucide-react";

const PRESET_AMOUNTS = [100, 250, 500, 1000] as const;

type Transaction = {
  id: string;
  type: string;
  description: string | null;
  amount: number;
  balanceAfter: number;
  createdAt: string;
};

export function PartnerWalletView({
  transactions,
  totalTopUp,
  totalSpent,
}: {
  transactions: Transaction[];
  totalTopUp: number;
  totalSpent: number;
}) {
  const { partner } = usePartner();
  const balance = partner.walletBalance;
  const walletOk = balance >= 25;

  const [selectedAmount, setSelectedAmount] = useState<number | null>(250);
  const [customAmount, setCustomAmount] = useState("");

  const checkoutAmount = customAmount
    ? Number(customAmount)
    : selectedAmount;

  const checkoutValid =
    checkoutAmount !== null &&
    Number.isFinite(checkoutAmount) &&
    checkoutAmount >= 25;

  const [checkoutPending, setCheckoutPending] = useState(false);
  const [subscribePending, setSubscribePending] = useState(false);
  const [weeklyAmount, setWeeklyAmount] = useState("500");

  async function startCheckout() {
    if (!checkoutValid || !checkoutAmount) return;
    setCheckoutPending(true);
    try {
      const res = await fetch("/api/wallet/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: checkoutAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch {
      // allow retry
    } finally {
      setCheckoutPending(false);
    }
  }

  async function startSubscribe() {
    const amount = Number(weeklyAmount);
    if (!Number.isFinite(amount) || amount < 25) return;
    setSubscribePending(true);
    try {
      const res = await fetch("/api/wallet/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Subscribe failed");
      if (data.url) window.location.href = data.url;
    } catch {
      // allow retry
    } finally {
      setSubscribePending(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Wallet"
        subtitle="Manage your balance and view transaction history"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Current Balance"
          value={`$${balance.toFixed(2)}`}
          valueClassName={walletOk ? undefined : "text-red-600"}
          subtitle={
            walletOk
              ? "Lead buying active"
              : "Below minimum — add funds to receive leads"
          }
          subtitleClassName={walletOk ? "text-emerald-600" : "text-red-500"}
          icon={Wallet}
          iconColor={walletOk ? "text-brand-600" : "text-red-600"}
          iconBgClassName={walletOk ? "bg-brand-50" : "bg-red-50"}
        />
        <StatCard
          label="Total Funded"
          value={`$${totalTopUp.toFixed(2)}`}
          valueClassName="text-emerald-600"
          subtitle="All-time top-ups"
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBgClassName="bg-emerald-50"
        />
        <StatCard
          label="Total Spent"
          value={`$${totalSpent.toFixed(2)}`}
          subtitle="Lead purchases"
          icon={TrendingDown}
          iconColor="text-slate-600"
          iconBgClassName="bg-slate-100"
        />
      </div>

      <div className="card mb-6 p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Add Funds</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-brand-50 p-2.5">
                <ArrowUpRight size={18} className="text-brand-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">One-Time Top-Up</h3>
                <p className="text-xs text-slate-500">Instant wallet credit via Stripe</p>
              </div>
            </div>

            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">
              Select amount
            </p>
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRESET_AMOUNTS.map((amount) => {
                const active = selectedAmount === amount && !customAmount;
                return (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      setSelectedAmount(amount);
                      setCustomAmount("");
                    }}
                    className={clsx(
                      "rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors",
                      active
                        ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500"
                        : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50/50"
                    )}
                  >
                    ${amount}
                  </button>
                );
              })}
            </div>

            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              Or custom amount
            </p>
            <div className="relative mb-4">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                $
              </span>
              <input
                type="number"
                min={25}
                step={1}
                placeholder="250"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
                className="form-input w-full pl-7"
              />
            </div>

            <button
              type="button"
              disabled={!checkoutValid || checkoutPending}
              onClick={startCheckout}
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checkoutPending
                ? "Redirecting to Stripe…"
                : checkoutValid
                  ? `Pay $${checkoutAmount!.toFixed(2)} with Stripe`
                  : "Enter amount to continue"}
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              Minimum top-up $25 · Secured by Stripe
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-violet-50 p-2.5">
                <RefreshCw size={18} className="text-violet-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Weekly Auto-Recharge</h3>
                <p className="text-xs text-slate-500">Automatic weekly wallet top-up</p>
              </div>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-slate-500">
              Set a weekly amount and never miss a lead because your balance ran low.
            </p>
            <div className="relative mb-3">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                $
              </span>
              <input
                type="number"
                min={25}
                placeholder="500"
                value={weeklyAmount}
                onChange={(e) => setWeeklyAmount(e.target.value)}
                className="form-input w-full pl-7"
              />
            </div>
            <button
              type="button"
              onClick={startSubscribe}
              disabled={subscribePending || Number(weeklyAmount) < 25}
              className="btn-secondary w-full disabled:opacity-50"
            >
              {subscribePending ? "Redirecting…" : "Enable auto-recharge"}
            </button>
          </div>
        </div>
      </div>

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
                  const isCredit = t.amount > 0;
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
                          {isCredit ? "+" : ""}${Math.abs(t.amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="font-medium text-slate-700">
                        ${t.balanceAfter.toFixed(2)}
                      </td>
                      <td className="text-xs text-slate-400">
                        {new Date(t.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
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
