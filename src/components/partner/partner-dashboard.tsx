"use client";

import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PortalLink } from "@/components/ui/portal-link";
import { usePartner } from "@/components/partner/partner-provider";
import { isPartnerActive } from "@/lib/partner/active";
import { Wallet, FileText, TrendUp, ShoppingBag, MapPin, WarningCircle } from "@/lib/icons/client";
import { formatDateTime } from "@/lib/format-datetime";
import { formatUsd } from "@/lib/format-money";

type RecentDelivery = {
  id: string;
  price: number;
  channel: string;
  deliveredAt: string;
  lead: {
    id: string;
    firstName: string;
    lastName: string;
    state: string;
    leadType: string;
  };
};

type DashboardStats = {
  deliveriesAll: number;
  deliveriesToday: number;
  spentThisMonth: number;
  recentDeliveries: RecentDelivery[];
};

export function PartnerDashboard({ stats }: { stats: DashboardStats }) {
  const { partner } = usePartner();
  const active = isPartnerActive(partner);
  const balance = partner.walletBalance;
  const statesOk = partner.hasEligibleFilterSet;
  const walletOk = balance >= 25;

  return (
    <div className={!active ? "pb-44 sm:pb-40" : undefined}>
      <PageHeader
        title={`Welcome back, ${partner.firstName}`}
        subtitle={partner.affiliation ?? "Partner Dashboard"}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Wallet Balance"
          value={formatUsd(balance)}
          icon={Wallet}
          accent={walletOk ? "emerald" : "red"}
          blobIndex={0}
        />
        <StatCard
          label="Leads Received"
          value={stats.deliveriesAll}
          icon={FileText}
          accent="blue"
          blobIndex={1}
        />
        <StatCard
          label="Received Today"
          value={stats.deliveriesToday}
          icon={TrendUp}
          accent="violet"
          blobIndex={2}
        />
        <StatCard
          label="Total Spent"
          value={formatUsd(stats.spentThisMonth)}
          icon={ShoppingBag}
          accent="cyan"
          blobIndex={3}
        />
      </div>


      <div className="mt-6 card">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Recent Leads</h2>
          <PortalLink href="/partner/leads" className="text-xs font-medium text-brand-600 hover:text-brand-700">
            View all →
          </PortalLink>
        </div>
        <div className="overflow-x-auto">
          {stats.recentDeliveries.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No leads yet"
              description="Once your account is active and your wallet is funded, leads will be distributed here automatically."
              accent="brand"
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>State</th>
                  <th>Type</th>
                  <th>Channel</th>
                  <th>Price</th>
                  <th>Delivered</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentDeliveries.map((d) => (
                  <tr key={d.id} className="cursor-pointer hover:bg-brand-50 transition-colors" onClick={() => { window.location.href = `/partner/leads/${d.id}`; }}>
                    <td className="font-medium text-slate-900">
                      {d.lead.firstName} {d.lead.lastName}
                    </td>
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
                      <Badge variant={d.channel === "realtime" ? "green" : "slate"}>
                        {d.channel === "realtime" ? "Real-time" : "Aged"}
                      </Badge>
                    </td>
                    <td className="font-semibold text-slate-900">{formatUsd(d.price)}</td>
                    <td className="text-xs text-slate-400" suppressHydrationWarning>
                      {formatDateTime(d.deliveredAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {!active && (
        <div
          className="fixed bottom-4 left-4 right-4 z-40 max-w-md rounded-xl border border-slate-200/80 bg-white/95 p-3.5 shadow-lg backdrop-blur-sm sm:bottom-6 sm:left-auto sm:right-6 sm:p-4"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-2.5 sm:gap-3">
            <WarningCircle size={18} className="mt-0.5 flex-shrink-0 text-amber-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">Complete your setup to start receiving leads</p>
              <div className="mt-2 space-y-1.5">
                <ChecklistItem
                  done={partner.status !== "pending_approval"}
                  label="Account approved by admin"
                />
                <ChecklistItem
                  done={statesOk}
                  label={
                    partner.hasStatesInAnyFilterSet && !statesOk
                      ? "Target filter set must be active (contact admin if this persists)"
                      : `At least 15 target states selected (${partner.maxFilterSetStates} selected)`
                  }
                  actionHref="/partner/settings"
                  actionLabel="Edit states"
                />
                <ChecklistItem
                  done={walletOk}
                  label="Wallet funded ($25+ to purchase a lead)"
                  actionHref="/partner/wallet"
                  actionLabel="Add $25 minimum"
                  linkOnlyWhenPending
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChecklistItem({
  done,
  label,
  actionHref,
  actionLabel,
  linkOnlyWhenPending,
}: {
  done: boolean;
  label: string;
  actionHref?: string;
  actionLabel?: string;
  linkOnlyWhenPending?: boolean;
}) {
  const linkClass = "text-xs font-medium text-brand-600 hover:underline";

  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          done
            ? "bg-emerald-500 text-white"
            : "border-2 border-amber-300 text-amber-600"
        }`}
      >
        {done ? "✓" : "!"}
      </span>
      {done ? (
        <span className="text-xs text-slate-500 line-through">{label}</span>
      ) : linkOnlyWhenPending && actionHref && actionLabel ? (
        <PortalLink href={actionHref} className={linkClass}>
          {actionLabel}
        </PortalLink>
      ) : (
        <>
          <span className="text-xs text-slate-700">{label}</span>
          {actionHref && actionLabel && (
            <PortalLink href={actionHref} className={linkClass}>
              {actionLabel} →
            </PortalLink>
          )}
        </>
      )}
    </div>
  );
}
