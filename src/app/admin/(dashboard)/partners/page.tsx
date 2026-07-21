import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Users, CheckCircle, Clock } from "@/lib/icons/ssr";
import { StatCard } from "@/components/ui/stat-card";
import { TablePagination } from "@/components/ui/table-pagination";
import { PortalDataTableCard } from "@/components/ui/portal-data-table";
import { parsePageParams } from "@/lib/pagination";
import { hasEligibleFilterSet } from "@/lib/partner/default-filter-set";
import { AdminPartnersTable } from "@/components/admin/admin-partners-table";
import {
  buildPartnerOrderBy,
  buildPartnerSortHref,
  parsePartnerSort,
  sortPartnersByLeadBuying,
  PARTNER_SORT_KEYS,
} from "@/lib/admin/partner-list-sort";
import {
  buildPartnerListWhere,
  buildPartnerStatusTabHref,
  parsePartnerFamilies,
} from "@/lib/admin/partner-list-filters";
import { AdminPartnersFilterBar } from "@/components/admin/admin-partners-filter-bar";

const BASE_PATH = "/admin/partners";

function sortHrefMap(
  searchParams: Record<string, string | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    PARTNER_SORT_KEYS.map((key) => [
      key,
      buildPartnerSortHref(BASE_PATH, searchParams, key),
    ]),
  );
}

export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: {
    status?: string;
    page?: string;
    sort?: string;
    dir?: string;
    family?: string;
  };
}) {
  const statusFilter = searchParams.status;
  const selectedFamilies = parsePartnerFamilies(searchParams);
  const { page, pageSize, skip } = parsePageParams(searchParams);
  const { sort, dir } = parsePartnerSort(searchParams);

  const where = buildPartnerListWhere(statusFilter, selectedFamilies);

  const partnerInclude = {
    filterSets: true,
    _count: { select: { leadDeliveries: true } },
  } as const;

  const countsPromise = Promise.all([
    prisma.partner.count({ where }),
    // Tab counts respect the active family filter (affiliation), not global totals.
    prisma.partner.count({
      where: buildPartnerListWhere("pending_approval", selectedFamilies),
    }),
    prisma.partner.count({
      where: buildPartnerListWhere("active", selectedFamilies),
    }),
    prisma.partner.count({
      where: buildPartnerListWhere("disabled", selectedFamilies),
    }),
    prisma.partner.groupBy({
      by: ["affiliation"],
      where: { affiliation: { not: null } },
      orderBy: { affiliation: "asc" },
    }),
  ]);

  let partners: Awaited<
    ReturnType<
      typeof prisma.partner.findMany<{ include: typeof partnerInclude }>
    >
  >;

  if (sort === "leadBuying") {
    const all = await prisma.partner.findMany({
      where,
      include: partnerInclude,
    });
    const sorted = sortPartnersByLeadBuying(all, dir);
    partners = sorted.slice(skip, skip + pageSize);
  } else {
    partners = await prisma.partner.findMany({
      orderBy: buildPartnerOrderBy(sort, dir),
      skip,
      take: pageSize,
      where,
      include: partnerInclude,
    });
  }

  const [total, pendingCount, activeCount, blockedCount, affiliationGroups] =
    await countsPromise;

  const affiliationOptions = affiliationGroups
    .map((g) => g.affiliation)
    .filter((a): a is string => a != null);

  const tableSort = {
    active: sort,
    dir,
    hrefBySortKey: sortHrefMap(searchParams),
  };

  const statusTabs = [
    {
      label: "All Partners",
      href: buildPartnerStatusTabHref(BASE_PATH, searchParams),
      active: !statusFilter,
      count: total,
    },
    {
      label: "Pending",
      href: buildPartnerStatusTabHref(BASE_PATH, searchParams, "pending_approval"),
      active: statusFilter === "pending_approval",
      count: pendingCount,
    },
    {
      label: "Active",
      href: buildPartnerStatusTabHref(BASE_PATH, searchParams, "active"),
      active: statusFilter === "active",
      count: activeCount,
    },
    {
      label: "Blocked",
      href: buildPartnerStatusTabHref(BASE_PATH, searchParams, "disabled"),
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

      <Suspense fallback={null}>
        <AdminPartnersFilterBar
          tabs={statusTabs}
          affiliationOptions={affiliationOptions}
          selectedFamilies={selectedFamilies}
        />
      </Suspense>

      <PortalDataTableCard className="flex-1">
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
            <AdminPartnersTable
              sort={tableSort}
              partners={partners.map((p) => {
                const isActive = p.status === "active";
                const walletOk = Number(p.walletBalance) >= 25;
                const statesOk = hasEligibleFilterSet(p.filterSets);
                const leadBuying = isActive && walletOk && statesOk;

                return {
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
                };
              })}
            />
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
