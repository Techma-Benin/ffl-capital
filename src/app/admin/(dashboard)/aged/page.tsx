import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Archive } from "@/lib/icons/ssr";
import { getDefaultAgedPrice } from "@/lib/settings/app-settings";
import { TablePagination } from "@/components/ui/table-pagination";
import { parsePageParams } from "@/lib/pagination";
import { formatUsd } from "@/lib/format-money";
import { AdminAgedLeadsTable } from "@/components/admin/admin-aged-leads-table";
import { AdminAgedLeadsFilters } from "@/components/admin/admin-aged-leads-filters";
import {
  buildAdminAgedLeadsWhere,
  parseAdminAgedLeadFilters,
} from "@/lib/admin/admin-aged-leads-filters";
import {
  buildAdminAgedLeadOrderBy,
  parseAdminAgedLeadSort,
  sortHrefMap,
} from "@/lib/admin/admin-aged-leads-sort";
import { refundLeadSnapshotFromAgedListing } from "@/lib/admin/refund-lead-snapshot";
import { US_STATE_CODES } from "@/lib/constants/us-states";
import {
  loadEnabledCategoryLabels,
  resolveLeadTypeDisplay,
  buildCategoryFilterOptions,
} from "@/lib/lead-categories/category-labels";

const BASE_PATH = "/admin/aged";

export default async function AdminAgedPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    sort?: string;
    dir?: string;
    state?: string;
    type?: string;
    status?: string;
    age?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const categories = await loadEnabledCategoryLabels();
  const filters = parseAdminAgedLeadFilters(
    resolvedSearchParams,
    categories.map((category) => category.type),
  );
  const agedWhere = await buildAdminAgedLeadsWhere(filters);
  const { page, pageSize, skip } = parsePageParams(resolvedSearchParams);
  const { sort, dir } = parseAdminAgedLeadSort(resolvedSearchParams);
  const orderBy = buildAdminAgedLeadOrderBy(sort, dir);
  const hrefBySortKey = sortHrefMap(BASE_PATH, resolvedSearchParams);

  const [leads, total, agedPrice, agedDays] = await Promise.all([
    prisma.lead.findMany({
      where: agedWhere,
      orderBy,
      skip,
      take: pageSize,
      include: {
        leadDeliveries: {
          include: { partner: true },
          orderBy: { deliveredAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.lead.count({ where: agedWhere }),
    getDefaultAgedPrice(),
    import("@/lib/settings/app-settings").then((m) => m.getAgedDaysThreshold()),
  ]);

  const stateOptions = US_STATE_CODES.map((code) => ({
    value: code,
    label: code,
  }));

  const typeFilterOptions = [
    { value: "all", label: "All" },
    ...buildCategoryFilterOptions(categories),
  ];

  const rows = leads.map((lead) => ({
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    state: lead.state,
    leadType: lead.leadType ?? "",
    leadTypeLabel: resolveLeadTypeDisplay({
      leadType: lead.leadType,
      categoryResolution: lead.categoryResolution,
      categoryCandidateTypes: lead.categoryCandidateTypes,
      categories,
    }).label,
    status: lead.status,
    ageDays: Math.floor(
      (Date.now() - lead.receivedAt.getTime()) / (1000 * 60 * 60 * 24),
    ),
    sheetLead: refundLeadSnapshotFromAgedListing(lead, {
      agedPrice,
      latestDelivery: lead.leadDeliveries[0] ?? null,
    }),
  }));

  return (
    <div>
      <PageHeader
        title="Aged Leads"
        subtitle={`Leads ${agedDays}+ days old — default price ${formatUsd(agedPrice)}`}
        badge={
          <span
            title={`${total.toLocaleString()} available`}
            className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-teal-200 bg-teal-50 px-1 text-xs font-semibold tabular-nums text-teal-700"
          >
            {total.toLocaleString()}
          </span>
        }
      />

      <Suspense
        fallback={
          <div className="mb-5 min-h-[36px] animate-pulse rounded-md bg-slate-50" />
        }
      >
        <AdminAgedLeadsFilters
          stateOptions={stateOptions}
          typeFilterOptions={typeFilterOptions}
        />
      </Suspense>

      <div className="card">
        <div className="overflow-x-auto">
          {leads.length === 0 ? (
            <EmptyState
              icon={Archive}
              title="No aged leads"
              description="Leads become eligible 30 days after receipt."
              accent="teal"
            />
          ) : (
            <AdminAgedLeadsTable
              leads={rows}
              agedPrice={agedPrice}
              sort={sort}
              dir={dir}
              hrefBySortKey={hrefBySortKey}
            />
          )}
        </div>
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          basePath={BASE_PATH}
          searchParams={resolvedSearchParams}
        />
      </div>
    </div>
  );
}
