"use client";

import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PortalLink } from "@/components/ui/portal-link";
import { usePartner } from "@/components/partner/partner-provider";
import { isPartnerActive } from "@/lib/partner/active";
import { Wallet, FileText, TrendUp, ShoppingBag, MapPin, WarningCircle } from "@phosphor-icons/react";

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
  recentDeliveries: RecentDelivery[];
};

export function PartnerDashboard({ stats }: { stats: DashboardStats }) {
  const { partner } = usePartner();
  const active = isPartnerActive(partner);
  const balance = partner.walletBalance;
  const statesOk = partner.hasEligibleFilterSet;
  const walletOk = balance >= 25;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${partner.firstName}`}
        subtitle={partner.affiliation ?? "Partner Dashboard"}
      />

      {!active && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <WarningCircle size={18} className="mt-0.5 flex-shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Complete your setup to start receiving leads</p>
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
                  actionLabel="Add funds"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Wallet Balance"
          value={`${balance.toFixed(2)}`}
          variant="hero"
          icon={Wallet}
          heroBg={walletOk ? "bg-emerald-400" : "bg-red-400"}
        />
        <StatCard
          label="Total Leads Received"
          value={stats.deliveriesAll}
          variant="hero"
          icon={FileText}
          heroBg="bg-orange-400"
        />
        <StatCard
          label="Received Today"
          value={stats.deliveriesToday}
          variant="hero"
          icon={TrendUp}
          heroBg="bg-violet-500"
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
                    <td className="font-semibold text-slate-900">${d.price.toFixed(2)}</td>
                    <td className="text-xs text-slate-400" suppressHydrationWarning>
                      {new Date(d.deliveredAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({
  done,
  label,
  actionHref,
  actionLabel,
}: {
  done: boolean;
  label: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          done
            ? "bg-emerald-500 text-white"
            : "border-2 border-amber-400 text-amber-600"
        }`}
      >
        {done ? "✓" : "!"}
      </span>
      <span className={`text-xs ${done ? "text-slate-500 line-through" : "text-amber-900"}`}>
        {label}
      </span>
      {!done && actionHref && (
        <PortalLink href={actionHref} className="text-xs font-medium text-brand-600 hover:underline">
          {actionLabel} →
        </PortalLink>
      )}
    </div>
  );
}
