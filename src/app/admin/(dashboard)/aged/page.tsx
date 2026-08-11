import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Archive } from "@/lib/icons/ssr";
import {
  getAgedDaysThreshold,
  getAgedPriceTiers,
  getDefaultAgedPrice,
} from "@/lib/settings/app-settings";
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
import {
  buildAgedAgeFilterOptions,
  resolveAgedPriceForAgeDays,
} from "@/lib/aged/price-tiers";

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
  const [categories, tiers, fallbackPrice, agedDays] = await Promise.all([
    loadEnabledCategoryLabels(),
    getAgedPriceTiers(),
    getDefaultAgedPrice(),
    getAgedDaysThreshold(),
  ]);
  const knownAgeBuckets = tiers.map((t) => String(t.minDays));
  const ageFilterOptions = buildAgedAgeFilterOptions(tiers);
  const filters = parseAdminAgedLeadFilters(
    resolvedSearchParams,
    categories.map((category) => category.type),
    knownAgeBuckets,
  );
  const agedWhere = await buildAdminAgedLeadsWhere(filters);
  const { page, pageSize, skip } = parsePageParams(resolvedSearchParams);
  const { sort, dir } = parseAdminAgedLeadSort(resolvedSearchParams);
  const orderBy = buildAdminAgedLeadOrderBy(sort, dir);
  const hrefBySortKey = sortHrefMap(BASE_PATH, resolvedSearchParams);

  const [leads, total] = await Promise.all([
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
  ]);

  const stateOptions = US_STATE_CODES.map((code) => ({
    value: code,
    label: code,
  }));

  const typeFilterOptions = [
    { value: "all", label: "All" },
    ...buildCategoryFilterOptions(categories),
  ];

  const lowestTierPrice = Math.min(...tiers.map((t) => t.price), fallbackPrice);

  const rows = leads.map((lead) => {
    const ageDays = Math.floor(
      (Date.now() - lead.receivedAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const price = resolveAgedPriceForAgeDays(ageDays, tiers, fallbackPrice);
    return {
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
      ageDays,
      price,
      sheetLead: refundLeadSnapshotFromAgedListing(lead, {
        agedPrice: price,
        latestDelivery: lead.leadDeliveries[0] ?? null,
      }),
    };
  });

  return (
    <div>
      <PageHeader
        title="Aged Leads"
        subtitle={`Leads ${agedDays}+ days old — from ${formatUsd(lowestTierPrice)} by age tier`}
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
          ageFilterOptions={ageFilterOptions}
        />
      </Suspense>

      <div className="card">
        <div className="overflow-x-auto">
          {leads.length === 0 ? (
            <EmptyState
              icon={Archive}
              title="No aged leads"
              description={`Leads become eligible ${agedDays} days after receipt.`}
              accent="teal"
            />
          ) : (
            <AdminAgedLeadsTable
              leads={rows}
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
