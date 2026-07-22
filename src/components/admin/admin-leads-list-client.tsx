"use client";

import { FileText } from "@/lib/icons/client";
import { EmptyState } from "@/components/ui/empty-state";
import { PortalDataTableCard } from "@/components/ui/portal-data-table";
import type { PortalDataTableColumn } from "@/components/ui/portal-data-table";
import { LeadColumnSettingsBridge } from "@/components/leads/lead-column-settings-bridge";
import { LeadViewsToolbar } from "@/components/leads/lead-views-toolbar";
import { AdminLeadsTable } from "@/components/admin/admin-leads-table";
import { AdminLeadsToolbarDisplayControls } from "@/components/leads/leads-toolbar-display-controls";
import { useAdminLeadsColumnVisibility } from "@/components/admin/use-admin-leads-column-visibility";
import { useAdminLeadsTableLayout } from "@/components/admin/use-admin-leads-table-layout";
import type { LeadColumnDef } from "@/lib/leads/list-view-columns";

type ViewRecord = {
  id: string;
  name: string;
  filters: unknown;
  sort: unknown;
  columns: unknown;
  isDefault: boolean;
};

type LeadRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  state: string;
  leadType: string;
  status: string;
  available: boolean;
  receivedAt: Date;
  trustedformCertUrl: string | null;
  partnerName: string | null;
  price: string | null;
};

export function AdminLeadsListClient({
  basePath,
  views,
  activeView,
  catalog,
  filterSummary,
  exportSlot,
  leads,
  columns,
  sort,
  pagination,
}: {
  basePath: string;
  views: ViewRecord[];
  activeView: ViewRecord;
  catalog: LeadColumnDef[];
  filterSummary?: React.ReactNode;
  exportSlot?: React.ReactNode;
  leads: LeadRow[];
  columns: PortalDataTableColumn[];
  sort: {
    active?: string;
    dir: "asc" | "desc";
    hrefBySortKey: Record<string, string>;
  };
  pagination?: React.ReactNode;
}) {
  const { layout, setLayout } = useAdminLeadsTableLayout();
  const { visibility, setColumnVisible } = useAdminLeadsColumnVisibility();

  return (
    <LeadColumnSettingsBridge>
      <PortalDataTableCard
        tabsSlot={
          <div className="px-1">
            <LeadViewsToolbar
              scope="admin"
              apiBase="/api/admin/lead-views"
              basePath={basePath}
              views={views}
              activeView={activeView}
              catalog={catalog}
              filterSummary={filterSummary}
              exportSlot={exportSlot}
              displayControls={
                <AdminLeadsToolbarDisplayControls
                  visibility={visibility}
                  onToggle={setColumnVisible}
                />
              }
            />
          </div>
        }
        footer={layout === "cards" ? pagination : undefined}
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
            leads={leads}
            columns={columns}
            sort={sort}
            layout={layout}
            visibility={visibility}
            tableFooter={layout === "table" ? pagination : undefined}
          />
        )}
      </PortalDataTableCard>
    </LeadColumnSettingsBridge>
  );
}
