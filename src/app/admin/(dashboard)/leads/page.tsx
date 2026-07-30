import { redirect } from "next/navigation";
import { LeadListViewScope } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { TablePagination } from "@/components/ui/table-pagination";
import { parsePageParams } from "@/lib/pagination";
import { formatUsd } from "@/lib/format-money";
import { LeadsExportButton } from "@/components/admin/leads-export-button";
import { AdminLeadsListClient } from "@/components/admin/admin-leads-list-client";
import { adminDatePeriodLabel } from "@/lib/admin/admin-date-period";
import {
  buildAdminLeadsWhere,
  legacyStatusToSlice,
} from "@/lib/admin/admin-leads-query";
import { loadEnabledCategoryLabels, resolveLeadTypeDisplay } from "@/lib/lead-categories/category-labels";
import {
  findAdminViewByStatusSlice,
  getDefaultLeadView,
  getLeadViewById,
  listLeadViews,
} from "@/lib/leads/lead-list-view-service";
import {
  ADMIN_LEAD_SORT_KEYS,
  buildAdminLeadOrderBy,
  buildAdminLeadSortHref,
  parseAdminLeadSort,
} from "@/lib/admin/admin-leads-sort";
import {
  ADMIN_LEAD_COLUMNS,
  mergeColumnsWithCatalog,
  portalColumnsFromView,
} from "@/lib/leads/list-view-columns";
import {
  leadViewSortSchema,
  parseAdminFilters,
  type LeadViewColumn,
} from "@/lib/leads/list-view-schema";

const BASE_PATH = "/admin/leads";

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    status?: string;
    page?: string;
    pageSize?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  if (resolvedSearchParams.status && !resolvedSearchParams.view) {
    const slice = legacyStatusToSlice(resolvedSearchParams.status);
    if (slice) {
      const matched = await findAdminViewByStatusSlice(slice);
      if (matched) {
        const params = new URLSearchParams();
        params.set("view", matched.id);
        redirect(`${BASE_PATH}?${params.toString()}`);
      }
    }
  }

  let viewId = resolvedSearchParams.view;
  if (!viewId) {
    const defaultView = await getDefaultLeadView(LeadListViewScope.admin);
    if (defaultView) {
      redirect(`${BASE_PATH}?view=${defaultView.id}`);
    }
  }

  const view = viewId ? await getLeadViewById(viewId) : null;
  if (!view || view.scope !== LeadListViewScope.admin || view.partnerId !== null) {
    const defaultView = await getDefaultLeadView(LeadListViewScope.admin);
    if (defaultView) redirect(`${BASE_PATH}?view=${defaultView.id}`);
    redirect(BASE_PATH);
  }

  const views = await listLeadViews(LeadListViewScope.admin);
  const filters = parseAdminFilters(view.filters);
  const sortJson = leadViewSortSchema.parse(view.sort);
  const columns = mergeColumnsWithCatalog(
    ADMIN_LEAD_COLUMNS,
    view.columns as LeadViewColumn[],
  );
  const tableColumns = portalColumnsFromView(ADMIN_LEAD_COLUMNS, columns);

  const { page, pageSize, skip } = parsePageParams(resolvedSearchParams);
  const sortState = parseAdminLeadSort(sortJson, resolvedSearchParams);
  const orderBy = buildAdminLeadOrderBy(sortJson, resolvedSearchParams);
  const whereClause = await buildAdminLeadsWhere(filters);

  const searchQuery = filters.q?.trim();

  const [leads, total, categories] = await Promise.all([
    prisma.lead.findMany({
      where: whereClause,
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
    prisma.lead.count({ where: whereClause }),
    loadEnabledCategoryLabels(),
  ]);

  const paginationParams: Record<string, string | undefined> = {
    view: view.id,
    sort: resolvedSearchParams.sort,
    dir: resolvedSearchParams.dir,
  };

  const sortHrefMap = Object.fromEntries(
    ADMIN_LEAD_SORT_KEYS.map((key) => [
      key,
      buildAdminLeadSortHref(BASE_PATH, paginationParams, key, sortState),
    ]),
  );

  const filterChips = buildFilterChips(filters);

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle={
          searchQuery
            ? `Search results for “${searchQuery}”`
            : "All incoming IUL leads and their delivery status"
        }
        action={<LeadsExportButton viewId={view.id} />}
      />

      <AdminLeadsListClient
        basePath={BASE_PATH}
        views={views}
        activeView={view}
        catalog={ADMIN_LEAD_COLUMNS}
        filterSummary={
          filterChips.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 px-1 text-xs text-slate-500">
              {filterChips.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-slate-100 px-2 py-0.5"
                >
                  {c}
                </span>
              ))}
            </div>
          ) : null
        }
        leads={leads.map((lead) => {
          const delivery = lead.leadDeliveries[0];
          return {
            id: lead.id,
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            phone: lead.phone,
            state: lead.state,
            leadType: lead.leadType ?? "",
            leadTypeLabel: resolveLeadTypeDisplay({
              leadType: lead.leadType,
              categoryResolution: lead.categoryResolution,
              categoryCandidateTypes: lead.categoryCandidateTypes,
              categories,
            }).label,
            status: lead.status,
            available: lead.available,
            receivedAt: lead.receivedAt,
            trustedformCertUrl: lead.trustedformCertUrl,
            partnerName: delivery
              ? `${delivery.partner.firstName} ${delivery.partner.lastName}`
              : null,
            price: delivery ? formatUsd(delivery.price) : null,
          };
        })}
        columns={tableColumns}
        sort={{
          active: sortState.field,
          dir: sortState.direction,
          hrefBySortKey: sortHrefMap,
        }}
        pagination={
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            basePath={BASE_PATH}
            searchParams={paginationParams}
          />
        }
      />
    </div>
  );
}

function buildFilterChips(filters: ReturnType<typeof parseAdminFilters>) {
  const chips: string[] = [];
  if (filters.statusSlice && filters.statusSlice !== "all") {
    chips.push(`Status: ${filters.statusSlice.replace(/_/g, " ")}`);
  }
  if (filters.states?.length) {
    const label =
      filters.states.length <= 4
        ? filters.states.join(", ")
        : `${filters.states.length} states`;
    chips.push(`State: ${label}`);
  }
  if (filters.datePeriod) {
    if (filters.datePeriod === "custom") {
      if (filters.from) chips.push(`From: ${filters.from}`);
      if (filters.to) chips.push(`To: ${filters.to}`);
    } else {
      const label = adminDatePeriodLabel(filters.datePeriod);
      if (label) chips.push(`Period: ${label}`);
    }
  }
  if (filters.q) chips.push(`Search: ${filters.q}`);
  return chips;
}
