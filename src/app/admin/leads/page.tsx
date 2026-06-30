import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "lucide-react";
import Link from "next/link";

type StatusFilter = "all" | "matched" | "unmatched" | "integrity_posted" | "aged_listed";

const STATUS_TABS: { label: string; value: StatusFilter; badgeVariant: "green" | "yellow" | "blue" | "slate" }[] = [
  { label: "All Leads",   value: "all",              badgeVariant: "slate" },
  { label: "Matched",     value: "matched",          badgeVariant: "green" },
  { label: "Unmatched",   value: "unmatched",        badgeVariant: "yellow" },
  { label: "Integrity",   value: "integrity_posted", badgeVariant: "blue" },
  { label: "Aged Listed", value: "aged_listed",      badgeVariant: "slate" },
];

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const statusFilter = searchParams.status as StatusFilter | undefined;

  const whereClause = statusFilter && statusFilter !== "all"
    ? { status: statusFilter === "matched" ? "delivered" : statusFilter }
    : {};

  const [leads, counts] = await Promise.all([
    prisma.lead.findMany({
      where: whereClause as never,
      orderBy: { receivedAt: "desc" },
      take: 100,
      include: {
        leadDeliveries: {
          include: { partner: true },
          orderBy: { deliveredAt: "desc" },
          take: 1,
        },
      },
    }),
    Promise.all(
      STATUS_TABS.map(async (tab) => {
        const w = tab.value === "all"
          ? {}
          : { status: tab.value === "matched" ? "delivered" : tab.value };
        return { value: tab.value, count: await prisma.lead.count({ where: w as never }) };
      })
    ),
  ]);

  const countMap = Object.fromEntries(counts.map((c) => [c.value, c.count]));

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="All incoming IUL leads and their delivery status"
      />

      <div className="card">
        {/* Status tabs */}
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-4 py-2">
          {STATUS_TABS.map((tab) => {
            const active = (statusFilter ?? "all") === tab.value;
            return (
              <Link
                key={tab.value}
                href={tab.value === "all" ? "/admin/leads" : `/admin/leads?status=${tab.value}`}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  active ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                  {countMap[tab.value] ?? 0}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          {leads.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No leads found"
              description="Use the lead simulator to inject test leads into the platform."
              action={
                <Link href="/dev/lead-simulator" className="btn-secondary btn-sm">
                  Open Simulator
                </Link>
              }
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>State</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Partner</th>
                  <th>Price</th>
                  <th>Received</th>
                  <th>TrustedForm</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const delivery = lead.leadDeliveries[0];
                  return (
                    <tr key={lead.id}>
                      <td>
                        <div>
                          <p className="font-medium text-slate-900">
                            {lead.firstName} {lead.lastName}
                          </p>
                          <p className="text-xs text-slate-400">{lead.email}</p>
                        </div>
                      </td>
                      <td className="text-slate-500">{lead.phone}</td>
                      <td>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">
                          {lead.state}
                        </span>
                      </td>
                      <td>
                        <Badge variant="blue">
                          {lead.leadType === "traditional_iul" ? "Trad. IUL" : "High Intent"}
                        </Badge>
                      </td>
                      <td>
                        <LeadStatusBadge status={lead.status} />
                      </td>
                      <td className="text-slate-600">
                        {delivery
                          ? `${delivery.partner.firstName} ${delivery.partner.lastName}`
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="font-semibold text-slate-700">
                        {delivery
                          ? `$${Number(delivery.price).toFixed(2)}`
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="text-slate-400 text-xs">
                        {new Date(lead.receivedAt).toLocaleString("en-US", {
                          month: "short",
                          day:   "numeric",
                          hour:  "2-digit",
                          minute:"2-digit",
                        })}
                      </td>
                      <td>
                        {lead.trustedformCertUrl ? (
                          <a
                            href={lead.trustedformCertUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-brand-600 hover:underline"
                          >
                            View cert
                          </a>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
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

function LeadStatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "green" | "yellow" | "red" | "blue" | "slate"; label: string }> = {
    delivered:        { variant: "green",  label: "Delivered" },
    unmatched:        { variant: "yellow", label: "Unmatched" },
    integrity_posted: { variant: "blue",   label: "Integrity" },
    aged_listed:      { variant: "slate",  label: "Aged" },
    dead:             { variant: "red",    label: "Dead" },
  };
  const c = config[status] ?? { variant: "slate" as const, label: status };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
