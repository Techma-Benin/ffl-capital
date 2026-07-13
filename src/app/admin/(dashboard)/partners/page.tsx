import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { Users, MapPin } from "lucide-react";
import { FilterTabLink } from "@/components/ui/filter-tab-link";
import { PartnerApprovalActions } from "@/components/admin/partner-approval-actions";
import { StatCard } from "@/components/ui/stat-card";
import { TablePagination } from "@/components/ui/table-pagination";
import { parsePageParams } from "@/lib/pagination";
import { hasEligibleFilterSet } from "@/lib/partner/default-filter-set";

export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const statusFilter = searchParams.status;
  const { page, pageSize, skip } = parsePageParams(searchParams);

  const where = statusFilter ? { status: statusFilter as never } : {};

  const [partners, total, pendingCount, activeCount] = await Promise.all([
    prisma.partner.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
      where,
      include: { filterSets: true },
    }),
    prisma.partner.count({ where }),
    prisma.partner.count({ where: { status: "pending_approval" } }),
    prisma.partner.count({ where: { status: "active" } }),
  ]);

  const statusTabs = [
    { label: "All Partners", value: undefined, count: total },
    { label: "Pending", value: "pending_approval", count: pendingCount },
    { label: "Active", value: "active", count: activeCount },
  ];

  return (
    <div>
      <PageHeader
        title="Partners"
        subtitle="Manage lead buyers and their accounts"
      />

      {/* Summary cards */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Partners" value={total} variant="blue" />
        <StatCard label="Active" value={activeCount} variant="mint" />
        <StatCard label="Pending" value={pendingCount} variant="orange" />
      </div>

      <div className="card">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 border-b border-slate-100 px-4 py-2">
          {statusTabs.map((tab) => (
            <FilterTabLink
              key={tab.label}
              href={tab.value ? `/admin/partners?status=${tab.value}` : "/admin/partners"}
              active={statusFilter === tab.value || (!statusFilter && !tab.value)}
            >
              {tab.label}
              <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                {tab.count}
              </span>
            </FilterTabLink>
          ))}
        </div>

        <div className="overflow-x-auto">
          {partners.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No partners yet"
              description="Partners will appear here once they sign up and complete onboarding."
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Partner</th>
                  <th>Affiliation</th>
                  <th>Lead Type</th>
                  <th>States</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Wallet</th>
                  <th>Lead Buying</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => {
                  const isActive = p.status === "active";
                  const walletOk = Number(p.walletBalance) >= 25;
                  const statesOk = hasEligibleFilterSet(p.filterSets);
                  const leadBuying = isActive && walletOk && statesOk;

                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/admin/partners/${p.id}`} className="hover:text-brand-600">
                          <p className="font-medium text-slate-900">
                            {p.firstName} {p.lastName}
                          </p>
                          <p className="text-xs text-slate-400">{p.email}</p>
                        </Link>
                      </td>
                      <td className="text-slate-500">{p.affiliation ?? "—"}</td>
                      <td>
                        <Badge variant="blue">
                          {p.leadType === "traditional_iul" ? "Trad. IUL" : "High Intent"}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400" />
                          <span className={`text-sm font-medium ${statesOk ? "text-slate-700" : "text-red-500"}`}>
                            {p.filterSets[0]?.filterStates.length ?? p.filterStates.length}
                            {!statesOk && " (min 15)"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <PartnerStatusBadge status={p.status} />
                      </td>
                      <td>
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                          {p.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`font-semibold ${walletOk ? "text-slate-900" : "text-red-500"}`}>
                          ${Number(p.walletBalance).toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <Badge variant={leadBuying ? "green" : "slate"}>
                          {leadBuying ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td>
                        {p.status === "pending_approval" ? (
                          <PartnerApprovalActions partnerId={p.id} />
                        ) : p.status === "active" ? (
                          <span className="text-xs text-slate-300 italic">—</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          basePath="/admin/partners"
          searchParams={searchParams}
        />
      </div>
    </div>
  );
}

function PartnerStatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: "green" | "yellow" | "red" | "slate"; label: string }> = {
    active:           { variant: "green",  label: "Active" },
    pending_approval: { variant: "yellow", label: "Pending" },
    rejected:         { variant: "red",    label: "Rejected" },
    disabled:         { variant: "slate",  label: "Disabled" },
  };
  const c = map[status] ?? { variant: "slate" as const, label: status };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
