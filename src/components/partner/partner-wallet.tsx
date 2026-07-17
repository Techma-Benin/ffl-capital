"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { usePartner } from "@/components/partner/partner-provider";
import { Wallet, ArrowUpRight, ArrowsClockwise } from "@phosphor-icons/react";

const PRESET_AMOUNTS = [100, 250, 500, 1000] as const;

type Transaction = {
  id: string;
  type: string;
  description: string | null;
  amount: number;
  balanceAfter: number;
  createdAt: string;
};

type Subscription = {
  amount: number;
  interval: string;
  nextChargeAt: string | null;
  active: boolean;
};

export function PartnerWalletView({
  transactions,
  totalTopUp,
  totalSpent,
  subscription,
}: {
  transactions: Transaction[];
  totalTopUp: number;
  totalSpent: number;
  subscription: Subscription | null;
}) {
  const { partner } = usePartner();
  const balance = partner.walletBalance;
  const walletOk = balance >= 25;

  const [selectedAmount, setSelectedAmount] = useState<number | null>(250);
  const [customAmount, setCustomAmount] = useState("");
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [subscribePending, setSubscribePending] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [weeklyAmount, setWeeklyAmount] = useState("500");

  const checkoutAmount = customAmount ? Number(customAmount) : selectedAmount;
  const checkoutValid =
    checkoutAmount !== null &&
    Number.isFinite(checkoutAmount) &&
    checkoutAmount >= 25;

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

  async function cancelSubscription() {
    setCancelPending(true);
    try {
      const res = await fetch("/api/wallet/subscribe", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Cancel failed");
      }
      window.location.reload();
    } catch {
      setCancelPending(false);
      setCancelConfirm(false);
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
        subtitle="Manage your balance and top up your account"
      />

      <div className="grid gap-6 lg:grid-cols-2">

        {/* ── LEFT: Balance + Add Funds ── */}
        <div className="flex flex-col gap-6">

          {/* Balance hero */}
          <div className={clsx("rounded-2xl p-8", walletOk ? "bg-slate-900" : "bg-red-950")}>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Current Balance
            </p>
            <p className="mt-3 text-5xl font-bold tracking-tight text-white">
              ${balance.toFixed(2)}
            </p>
            <p className={clsx("mt-2 text-sm font-medium", walletOk ? "text-emerald-400" : "text-red-400")}>
              {walletOk ? "Lead buying active" : "Below $25 minimum — add funds to receive leads"}
            </p>
          </div>

          {/* One-Time Top-Up card */}
          <div className="card p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-brand-50 p-2.5">
                <ArrowUpRight size={18} className="text-brand-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">One-Time Top-Up</h3>
                <p className="text-xs text-slate-500">Instant wallet credit via Stripe</p>
              </div>
            </div>

            <p className="mb-2 text-xs font-medium text-slate-600">Enter Amount</p>
            <div className="relative mb-4">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                $
              </span>
              <input
                type="number"
                min={25}
                step={1}
                placeholder="0"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                className="form-input w-full pl-7"
              />
            </div>

            <p className="mb-2 text-xs font-medium text-slate-600">Quick Select</p>
            <div className="mb-5 grid grid-cols-4 gap-2">
              {PRESET_AMOUNTS.map((amount) => {
                const active = Number(customAmount) === amount;
                return (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => { setCustomAmount(String(amount)); setSelectedAmount(null); }}
                    className={clsx(
                      "rounded-lg border py-2.5 text-sm font-semibold transition-colors",
                      active
                        ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500"
                        : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50/50",
                    )}
                  >
                    ${amount}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={!checkoutValid || checkoutPending}
              onClick={startCheckout}
              className="btn-primary w-full text-center disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checkoutPending ? "Redirecting to Stripe…" : "Proceed to the payment"}
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              Minimum top-up $25 · Secured by Stripe
            </p>
          </div>

          {/* Weekly Auto-Recharge card */}
          <div className="card p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-violet-50 p-2.5">
                <ArrowsClockwise size={18} className="text-violet-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Weekly Auto-Recharge</h3>
                <p className="text-xs text-slate-500">Automatic weekly wallet top-up</p>
              </div>
            </div>

            {subscription?.active ? (
              <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <p className="text-sm font-semibold text-emerald-800">
                  Active — ${subscription.amount.toFixed(2)}/week
                </p>
                {subscription.nextChargeAt && (
                  <p className="mt-0.5 text-xs text-emerald-700">
                    Next charge:{" "}
                    {new Date(subscription.nextChargeAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            ) : (
              <p className="mb-4 text-xs leading-relaxed text-slate-500">
                Set a weekly amount and never miss a lead because your balance ran low.
              </p>
            )}

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
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              {subscribePending
                ? "Redirecting…"
                : subscription?.active
                  ? `Change to ${weeklyAmount}/week`
                  : "Enable auto-recharge"}
            </button>

            {subscription?.active && (
              cancelConfirm ? (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="mb-3 text-xs font-medium text-red-700">
                    Cancel your weekly auto-recharge? No further charges will be made.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={cancelSubscription}
                      disabled={cancelPending}
                      className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {cancelPending ? "Cancelling…" : "Yes, cancel"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancelConfirm(false)}
                      disabled={cancelPending}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Keep active
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCancelConfirm(true)}
                  className="mt-2 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  Cancel auto-recharge
                </button>
              )
            )}
          </div>
        </div>

        {/* ── RIGHT: Transaction History ── */}
        <div className="self-start">
          <h2 className="mb-3 px-1 text-base font-semibold text-slate-900">Transaction History</h2>

          {transactions.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <Wallet size={28} className="mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">No transactions yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {transactions.map((t) => {
                const isCredit = t.amount > 0;
                return (
                  <div key={t.id} className="relative rounded-2xl border border-slate-200/80 bg-white shadow-none transition-shadow hover:shadow-card-hover">
                    {/* Top section */}
                    <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
                      <div className="min-w-0 flex-1">
                        <TransactionTypeBadge type={t.type} />
                        {t.description && (
                          <p className="mt-1.5 truncate text-xs font-medium text-slate-700">{t.description}</p>
                        )}
                      </div>
                      <p className={clsx("shrink-0 text-base font-bold tabular-nums", isCredit ? "text-emerald-600" : "text-slate-900")}>
                        {isCredit ? "+" : "−"}${Math.abs(t.amount).toFixed(2)}
                      </p>
                    </div>

                    {/* Dashed tear line with notch cutouts */}
                    <div className="relative flex items-center">
                      <div className="absolute -left-2.5 h-5 w-5 rounded-full bg-[#f4f7fb]" />
                      <div className="mx-4 flex-1 border-t border-dashed border-slate-200" />
                      <div className="absolute -right-2.5 h-5 w-5 rounded-full bg-[#f4f7fb]" />
                    </div>

                    {/* Bottom section */}
                    <div className="flex items-center justify-between px-5 pt-2.5 pb-3.5">
                      <p className="text-[11px] text-slate-400" suppressHydrationWarning>
                        {new Date(t.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-[11px] font-medium text-slate-400">
                        bal. ${t.balanceAfter.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
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
