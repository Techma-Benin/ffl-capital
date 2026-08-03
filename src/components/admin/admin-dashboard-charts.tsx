"use client";

import { StatCard } from "@/components/ui/stat-card";
import { IntakeAreaChart, DonutChart } from "@/components/ui/charts";
import { DashboardEmptyState } from "@/components/ui/dashboard-empty-state";
import { PortalLink } from "@/components/ui/portal-link";
import { Badge } from "@/components/ui/badge";
import { FileText, CalendarCheck, UsersThree, Warning } from "@/lib/icons/client";
import { formatDateTime } from "@/lib/format-datetime";

type RecentLead = {
  id: string;
  firstName: string;
  lastName: string;
  state: string;
  leadType: string;
  leadTypeLabel: string;
  status: string;
  receivedAt: string;
  partnerName: string | null;
};

export function AdminDashboardCharts({
  intakeByDay,
  sparkByDay,
  intakeVolumeLabel = "Daily volume",
  deliveringDonut,
  deliveryRatePercent = null,
  kpis,
  recentLeads,
}: {
  intakeByDay: Array<{ label: string; leads: number }>;
  sparkByDay: Array<{ value: number }>;
  intakeVolumeLabel?: string;
  deliveringDonut: Array<{ name: string; value: number }>;
  /** Share of period-entered leads with status delivered; null when none entered. */
  deliveryRatePercent?: number | null;
  kpis: {
    leadsInPeriod: number;
    deliveriesInPeriod: number;
    activePartners: number;
    unmatchedLeads: number;
  };
  recentLeads: RecentLead[];
}) {
  const hasEnteredLeads = deliveringDonut.length > 0;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Leads" value={kpis.leadsInPeriod.toLocaleString()} icon={FileText} accent="blue" blobIndex={0} />
        <StatCard label="Deliveries" value={kpis.deliveriesInPeriod.toLocaleString()} icon={CalendarCheck} accent="purple" blobIndex={1} />
        <StatCard label="Active Partners" value={kpis.activePartners} icon={UsersThree} accent="rose" blobIndex={2} />
        <StatCard label="Unmatched" value={kpis.unmatchedLeads} icon={Warning} accent="orange" blobIndex={3} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Lead Intake</h2>
            <span className="text-xs text-slate-400">{intakeVolumeLabel}</span>
          </div>
          <IntakeAreaChart data={intakeByDay} height={300} />
        </div>

        <div className="card flex min-h-0 flex-col p-5">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Delivering</h2>
          {hasEnteredLeads ? (
            <div className="flex w-full min-h-[300px] flex-1 flex-col items-center justify-center">
              <DonutChart
                data={deliveringDonut}
                height={300}
                centerValue={
                  deliveryRatePercent != null ? `${deliveryRatePercent}%` : undefined
                }
                centerLabel="Delivered"
                colors={deliveringDonut.map((d) =>
                  d.name === "Delivered" ? "#00A651" : "#94A3B8",
                )}
              />
            </div>
          ) : (
            <div className="flex w-full min-h-[300px] flex-1 flex-col items-center justify-center">
              <DashboardEmptyState
                icon={CalendarCheck}
                title="No leads yet"
                accent="purple"
                blobIndex={1}
              />
            </div>
          )}
        </div>
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
                  <td colSpan={6} className="py-10">
                    <DashboardEmptyState
                      icon={FileText}
                      title="No leads yet"
                      accent="blue"
                      blobIndex={0}
                    />
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
                      {lead.leadTypeLabel}
                    </td>
                    <td>
                      <LeadStatusBadge status={lead.status} />
                    </td>
                    <td className="text-slate-500">{lead.partnerName ?? "—"}</td>
                    <td className="text-xs text-slate-400" suppressHydrationWarning>
                      {formatDateTime(lead.receivedAt)}
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

