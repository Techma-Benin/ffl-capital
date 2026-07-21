import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Users, CheckCircle, Clock } from "@/lib/icons/ssr";
import { StatCard } from "@/components/ui/stat-card";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  PortalDataTable,
  PortalDataTableCard,
} from "@/components/ui/portal-data-table";
import { parsePageParams } from "@/lib/pagination";
import { hasEligibleFilterSet } from "@/lib/partner/default-filter-set";
import { PartnerTableRow } from "@/components/admin/partner-table-row";

const PARTNER_COLUMNS = [
  { key: "partner", label: "Partner" },
  { key: "affiliation", label: "Affiliation", headerClassName: "text-center" },
  { key: "status", label: "Status", headerClassName: "text-center" },
  { key: "priority", label: "Priority", headerClassName: "text-center" },
  { key: "wallet", label: "Wallet", headerClassName: "text-center" },
  { key: "leadBuying", label: "Lead Buying", headerClassName: "text-center" },
  { key: "leads", label: "Leads Purchased", headerClassName: "text-center" },
  { key: "actions", label: "", headerClassName: "w-12 text-center" },
];

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
    { label: "All Partners", href: "/admin/partners", active: !statusFilter, count: total },
    {
      label: "Pending",
      href: "/admin/partners?status=pending_approval",
      active: statusFilter === "pending_approval",
      count: pendingCount,
    },
    {
      label: "Active",
      href: "/admin/partners?status=active",
      active: statusFilter === "active",
      count: activeCount,
    },
    {
      label: "Blocked",
      href: "/admin/partners?status=disabled",
      active: statusFilter === "disabled",
      count: blockedCount,
    },
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <PageHeader
        title="Partners"
        subtitle="Manage lead buyers and their accounts"
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Partners" value={total} icon={Users} accent="blue" blobIndex={0} />
        <StatCard label="Active" value={activeCount} icon={CheckCircle} accent="mint" blobIndex={1} />
        <StatCard label="Pending" value={pendingCount} icon={Clock} accent="orange" blobIndex={2} />
      </div>

      <PortalDataTableCard tabs={statusTabs} className="flex-1">
        {partners.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Users}
              title="No partners yet"
              description="Partners will appear here once they sign up and complete onboarding."
              accent="rose"
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <PortalDataTable columns={PARTNER_COLUMNS}>
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
            </PortalDataTable>
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={total}
              basePath="/admin/partners"
              searchParams={searchParams}
            />
          </div>
        )}
      </PortalDataTableCard>
    </div>
  );
}
