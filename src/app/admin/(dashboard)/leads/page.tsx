import { redirect } from "next/navigation";
import { LeadListViewScope } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "@/lib/icons/ssr";
import { TablePagination } from "@/components/ui/table-pagination";
import { PortalDataTableCard } from "@/components/ui/portal-data-table";
import { parsePageParams } from "@/lib/pagination";
import { LeadsExportButton } from "@/components/admin/leads-export-button";
import { AdminLeadsTable } from "@/components/admin/admin-leads-table";
import { LeadViewsToolbar } from "@/components/leads/lead-views-toolbar";
import { LeadColumnSettingsBridge } from "@/components/leads/lead-column-settings-bridge";
import {
  buildAdminLeadsWhere,
  legacyStatusToSlice,
} from "@/lib/admin/admin-leads-query";
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

const ADMIN_SORT_OPTIONS = [
  { value: "receivedAt", label: "Received" },
  { value: "name", label: "Name" },
  { value: "state", label: "State" },
  { value: "leadType", label: "Type" },
  { value: "status", label: "Status" },
  { value: "phone", label: "Phone" },
];

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: {
    view?: string;
    status?: string;
    page?: string;
    pageSize?: string;
    sort?: string;
    dir?: string;
  };
}) {
  if (searchParams.status && !searchParams.view) {
    const slice = legacyStatusToSlice(searchParams.status);
    if (slice) {
      const matched = await findAdminViewByStatusSlice(slice);
      if (matched) {
        const params = new URLSearchParams();
        params.set("view", matched.id);
        redirect(`${BASE_PATH}?${params.toString()}`);
      }
    }
  }

  let viewId = searchParams.view;
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

  const { page, pageSize, skip } = parsePageParams(searchParams);
  const sortState = parseAdminLeadSort(sortJson, searchParams);
  const orderBy = buildAdminLeadOrderBy(sortJson, searchParams);
  const whereClause = await buildAdminLeadsWhere(filters);

  const searchQuery = filters.q?.trim();

  const [leads, total] = await Promise.all([
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
  ]);

  const paginationParams: Record<string, string | undefined> = {
    view: view.id,
    sort: searchParams.sort,
    dir: searchParams.dir,
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

      <LeadColumnSettingsBridge>
        <PortalDataTableCard
        tabsSlot={
          <div className="px-1">
            <LeadViewsToolbar
              scope="admin"
              apiBase="/api/admin/lead-views"
              basePath={BASE_PATH}
              views={views}
              activeView={view}
              catalog={ADMIN_LEAD_COLUMNS}
              sortOptions={ADMIN_SORT_OPTIONS}
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
            />
          </div>
        }
        footer={
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            basePath={BASE_PATH}
            searchParams={paginationParams}
          />
        }
      >
        {leads.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No leads found"
            description="Try editing this view’s filters or create a new view."
            accent="orange"
          />
        ) : (
          <AdminLeadsTable
            leads={leads.map((lead) => {
              const delivery = lead.leadDeliveries[0];
              return {
                id: lead.id,
                firstName: lead.firstName,
                lastName: lead.lastName,
                email: lead.email,
                phone: lead.phone,
                state: lead.state,
                leadType: lead.leadType,
                status: lead.status,
                available: lead.available,
                receivedAt: lead.receivedAt,
                trustedformCertUrl: lead.trustedformCertUrl,
                partnerName: delivery
                  ? `${delivery.partner.firstName} ${delivery.partner.lastName}`
                  : null,
                price: delivery
                  ? `$${Number(delivery.price).toFixed(2)}`
                  : null,
              };
            })}
            columns={tableColumns}
            sort={{
              active: sortState.field,
              dir: sortState.direction,
              hrefBySortKey: sortHrefMap,
            }}
          />
        )}
        </PortalDataTableCard>
      </LeadColumnSettingsBridge>
    </div>
  );
}

function buildFilterChips(filters: ReturnType<typeof parseAdminFilters>) {
  const chips: string[] = [];
  if (filters.statusSlice && filters.statusSlice !== "all") {
    chips.push(`Status: ${filters.statusSlice.replace(/_/g, " ")}`);
  }
  if (filters.state) chips.push(`State: ${filters.state}`);
  if (filters.from) chips.push(`From: ${filters.from}`);
  if (filters.to) chips.push(`To: ${filters.to}`);
  if (filters.q) chips.push(`Search: ${filters.q}`);
  return chips;
}
