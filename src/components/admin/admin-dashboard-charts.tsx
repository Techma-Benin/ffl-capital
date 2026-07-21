"use client";

import { StatCard } from "@/components/ui/stat-card";
import { IntakeAreaChart, DonutChart } from "@/components/ui/charts";
import { PortalLink } from "@/components/ui/portal-link";
import { Badge } from "@/components/ui/badge";
import { WarningCircle, Clock, FileText, CalendarCheck, UsersThree, Warning } from "@phosphor-icons/react";

type RecentLead = {
  id: string;
  firstName: string;
  lastName: string;
  state: string;
  leadType: string;
  status: string;
  receivedAt: string;
  partnerName: string | null;
};

export function AdminDashboardCharts({
  intakeByDay,
  sparkByDay,
  deliveringDonut,
  kpis,
  recentLeads,
  pendingPartners,
  unmatchedLeads,
}: {
  intakeByDay: Array<{ label: string; leads: number }>;
  sparkByDay: Array<{ value: number }>;
  deliveringDonut: Array<{ name: string; value: number }>;
  kpis: {
    totalLeads: number;
    leadsToday: number;
    activePartners: number;
    unmatchedLeads: number;
  };
  recentLeads: RecentLead[];
  pendingPartners: number;
  unmatchedLeads: number;
}) {
  const hasDeliveries = deliveringDonut.length > 0;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Leads" value={kpis.totalLeads.toLocaleString()} icon={FileText} accent="blue" />
        <StatCard label="Leads Today" value={kpis.leadsToday} icon={CalendarCheck} accent="purple" />
        <StatCard label="Active Partners" value={kpis.activePartners} icon={UsersThree} accent="rose" />
        <StatCard label="Unmatched" value={kpis.unmatchedLeads} icon={Warning} accent="orange" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Lead Intake (7 days)</h2>
            <span className="text-xs text-slate-400">Daily volume</span>
          </div>
          <IntakeAreaChart data={intakeByDay} />
        </div>

        <div className="card p-5">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Delivering</h2>
          {hasDeliveries ? (
            <>
              <DonutChart data={deliveringDonut} />
              <ul className="mt-3 space-y-1.5">
                {deliveringDonut.map((d) => (
                  <li key={d.name} className="flex justify-between text-xs text-slate-600">
                    <span>{d.name}</span>
                    <span className="font-semibold">{d.value}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">No deliveries yet</p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {pendingPartners > 0 ? (
          <PortalLink
            href="/admin/partners?status=pending_approval"
            className="block transition-opacity hover:opacity-95"
          >
            <StatCard
              label="Pending Approvals"
              value={pendingPartners}
              icon={Clock}
              accent="amber"
            />
          </PortalLink>
        ) : (
          <StatCard label="Pending Approvals" value={pendingPartners} icon={Clock} accent="amber" />
        )}
        {unmatchedLeads > 0 ? (
          <PortalLink
            href="/admin/leads?status=unmatched"
            className="block transition-opacity hover:opacity-95"
          >
            <StatCard
              label="Reprocess Queue"
              value={unmatchedLeads}
              icon={WarningCircle}
              accent="amber"
            />
          </PortalLink>
        ) : (
          <StatCard
            label="Reprocess Queue"
            value={unmatchedLeads}
            icon={WarningCircle}
            accent="amber"
          />
        )}
      </div>

      <div className="mt-6 card">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Recent Leads</h2>
          <PortalLink
            href="/admin/leads"
            className="text-xs font-medium text-brand-700 hover:text-brand-800"
          >
            View all →
          </PortalLink>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>State</th>
                <th>Type</th>
                <th>Status</th>
                <th>Partner</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {recentLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No leads yet
                  </td>
                </tr>
              ) : (
                recentLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="cursor-pointer hover:bg-brand-50 transition-colors"
                    onClick={() => window.location.href = `/admin/leads/${lead.id}`}
                  >
                    <td className="font-medium text-slate-900">
                      {lead.firstName} {lead.lastName}
                    </td>
                    <td>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">
                        {lead.state}
                      </span>
                    </td>
                    <td className="text-slate-500">
                      {lead.leadType === "traditional_iul" ? "Traditional IUL" : "High Intent IUL"}
                    </td>
                    <td>
                      <LeadStatusBadge status={lead.status} />
                    </td>
                    <td className="text-slate-500">{lead.partnerName ?? "—"}</td>
                    <td className="text-xs text-slate-400">
                      {formatRelativeTime(lead.receivedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function LeadStatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "green" | "yellow" | "red" | "blue" | "slate"; label: string }> = {
    delivered: { variant: "green", label: "Delivered" },
    unmatched: { variant: "yellow", label: "Unmatched" },
    integrity_posted: { variant: "blue", label: "Integrity" },
    aged_listed: { variant: "slate", label: "Aged" },
    dead: { variant: "slate", label: "Dead" },
  };
  const c = config[status] ?? { variant: "slate" as const, label: status };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
