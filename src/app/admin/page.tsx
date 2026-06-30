import { prisma } from "@/lib/db";
import { PartnerStatus } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  FileText,
  Users,
  AlertCircle,
  Clock,
  TrendingUp,
  CheckCircle,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function AdminDashboardPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalLeads,
    leadsToday,
    activePartners,
    pendingPartners,
    unmatchedLeads,
    deliveredToday,
    recentLeads,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { receivedAt: { gte: today } } }),
    prisma.partner.count({ where: { status: PartnerStatus.active } }),
    prisma.partner.count({ where: { status: PartnerStatus.pending_approval } }),
    prisma.lead.count({ where: { status: "unmatched", available: true } }),
    prisma.leadDelivery.count({ where: { deliveredAt: { gte: today } } }),
    prisma.lead.findMany({
      orderBy: { receivedAt: "desc" },
      take: 8,
      include: {
        leadDeliveries: {
          include: { partner: true },
          orderBy: { deliveredAt: "desc" },
          take: 1,
        },
      },
    }),
  ]);

  const matchRate = leadsToday > 0
    ? Math.round((deliveredToday / leadsToday) * 100)
    : 0;

  return (
    <div>
      <PageHeader
        title="Operations Dashboard"
        subtitle="Overview of platform activity"
      />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Total Leads"
          value={totalLeads.toLocaleString()}
          icon={FileText}
          iconColor="text-brand-600"
          className="xl:col-span-2"
        />
        <StatCard
          label="Leads Today"
          value={leadsToday}
          icon={Activity}
          iconColor="text-violet-600"
        />
        <StatCard
          label="Delivered Today"
          value={deliveredToday}
          icon={CheckCircle}
          iconColor="text-emerald-600"
        />
        <StatCard
          label="Active Partners"
          value={activePartners}
          icon={Users}
          iconColor="text-sky-600"
        />
        <StatCard
          label="Unmatched"
          value={unmatchedLeads}
          subtitle="In reprocess queue"
          icon={AlertCircle}
          iconColor="text-amber-600"
        />
      </div>

      {/* Secondary row */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Match rate */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Today&apos;s Match Rate
            </p>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{matchRate}%</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${matchRate}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {deliveredToday} of {leadsToday} leads matched
          </p>
        </div>

        {/* Pending approvals */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pending Approvals
            </p>
            <Clock size={16} className="text-amber-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{pendingPartners}</p>
          <p className="mt-1 text-sm text-slate-500">Partners awaiting activation</p>
          {pendingPartners > 0 && (
            <Link
              href="/admin/partners?status=pending_approval"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Review now →
            </Link>
          )}
        </div>

        {/* Unmatched queue */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Reprocess Queue
            </p>
            <AlertCircle size={16} className="text-amber-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{unmatchedLeads}</p>
          <p className="mt-1 text-sm text-slate-500">Unmatched, pending 24h retry</p>
          {unmatchedLeads > 0 && (
            <Link
              href="/admin/leads?status=unmatched"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              View queue →
            </Link>
          )}
        </div>
      </div>

      {/* Recent leads */}
      <div className="mt-6 card">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Recent Leads</h2>
          <Link
            href="/admin/leads"
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            View all →
          </Link>
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
                    No leads yet &mdash; inject via lead simulator
                  </td>
                </tr>
              ) : (
                recentLeads.map((lead) => {
                  const delivery = lead.leadDeliveries[0];
                  return (
                    <tr key={lead.id}>
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
                      <td className="text-slate-500">
                        {delivery
                          ? `${delivery.partner.firstName} ${delivery.partner.lastName}`
                          : "—"}
                      </td>
                      <td className="text-slate-400 text-xs">
                        {formatRelativeTime(lead.receivedAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LeadStatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "green" | "yellow" | "red" | "blue" | "slate"; label: string }> = {
    delivered:       { variant: "green",  label: "Delivered" },
    unmatched:       { variant: "yellow", label: "Unmatched" },
    integrity_posted:{ variant: "blue",   label: "Integrity" },
    aged_listed:     { variant: "purple" as "slate", label: "Aged" },
    dead:            { variant: "slate",  label: "Dead" },
  };
  const c = config[status] ?? { variant: "slate" as const, label: status };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function formatRelativeTime(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
