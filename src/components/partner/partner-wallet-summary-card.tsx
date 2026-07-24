"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePartner } from "@/components/partner/partner-provider";
import { formatUsd } from "@/lib/format-money";
import { Wallet, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";

type SubscriptionStatus = {
  active: boolean;
  amount: number;
} | null;

export function PartnerWalletSummaryCard({
  initialBalance,
  initialSubscription,
}: {
  initialBalance?: number;
  initialSubscription?: SubscriptionStatus;
}) {
  const { partner } = usePartner();
  const router = useRouter();
  const balance = initialBalance ?? partner.walletBalance;

  const [subscription, setSubscription] = useState<SubscriptionStatus | undefined>(
    initialSubscription !== undefined ? initialSubscription : undefined,
  );

  useEffect(() => {
    if (initialSubscription !== undefined) return;
    void (async () => {
      try {
        const res = await fetch("/api/wallet/subscribe");
        if (!res.ok) return;
        const data = await res.json();
        setSubscription(data?.active ? data : null);
      } catch {
        setSubscription(null);
      }
    })();
  }, [initialSubscription]);

  const autoReloadOn = subscription?.active === true;

  return (
    <section
      id="wallet-summary"
      className="card flex h-full min-w-0 flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">Wallet &amp; billing</h2>
        <button
          type="button"
          title="Go to wallet"
          onClick={() => router.push("/partner/wallet")}
          className="rounded-lg bg-amber-50 p-1.5 text-amber-800 transition-colors hover:bg-amber-100 hover:text-amber-900"
        >
          <Wallet size={18} weight={ICON_WEIGHT_LINEAR} />
        </button>
      </div>

      {/* Rows */}
      <div className="flex flex-col divide-y divide-slate-100 px-5">
        {/* Balance */}
        <div className="flex items-center justify-between py-4">
          <span className="text-sm text-slate-500">Balance</span>
          <span className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">
            {formatUsd(balance)}
          </span>
        </div>

        {/* Auto-reload */}
        <div className="flex items-center justify-between py-4">
          <span className="text-sm text-slate-500">Auto-reload</span>
          {subscription === undefined ? (
            <span className="text-xs text-slate-400">…</span>
          ) : (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                autoReloadOn
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {autoReloadOn ? "On" : "Off"}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
