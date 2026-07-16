import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "@phosphor-icons/react/dist/ssr";
import { FilterTabLink } from "@/components/ui/filter-tab-link";
import { StatCard } from "@/components/ui/stat-card";
import { TablePagination } from "@/components/ui/table-pagination";
import { parsePageParams } from "@/lib/pagination";
import { hasEligibleFilterSet } from "@/lib/partner/default-filter-set";
import { PartnerTableRow } from "@/components/admin/partner-table-row";

export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const statusFilter = searchParams.status;
  const { page, pageSize, skip } = parsePageParams(searchParams);

  const where = statusFilter ? { status: statusFilter as never } : {};

  const [partners, total, pendingCount, activeCount, blockedCount] = await Promise.all([
    prisma.partner.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
      where,
      include: {
        filterSets: true,
        _count: { select: { leadDeliveries: true } },
      },
    }),
    prisma.partner.count({ where }),
    prisma.partner.count({ where: { status: "pending_approval" } }),
    prisma.partner.count({ where: { status: "active" } }),
    prisma.partner.count({ where: { status: "disabled" } }),
  ]);

  const statusTabs = [
    { label: "All Partners", value: undefined, count: total },
    { label: "Pending", value: "pending_approval", count: pendingCount },
    { label: "Active", value: "active", count: activeCount },
    { label: "Blocked", value: "disabled", count: blockedCount },
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
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Wallet</th>
                  <th>Lead Buying</th>
                  <th>Leads Purchased</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => {
                  const isActive = p.status === "active";
                  const walletOk = Number(p.walletBalance) >= 25;
                  const statesOk = hasEligibleFilterSet(p.filterSets);
                  const leadBuying = isActive && walletOk && statesOk;

                  return (
                    <PartnerTableRow
                      key={p.id}
                      partner={{
                        id: p.id,
                        firstName: p.firstName,
                        lastName: p.lastName,
                        email: p.email,
                        affiliation: p.affiliation,
                        status: p.status,
                        priority: p.priority,
                        walletBalance: Number(p.walletBalance),
                        leadBuying,
                        walletOk,
                        leadsCount: p._count.leadDeliveries,
                      }}
                    />
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
