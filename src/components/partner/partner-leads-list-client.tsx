"use client";

import { FileText } from "@/lib/icons/client";
import { EmptyState } from "@/components/ui/empty-state";
import type { PortalDataTableColumn } from "@/components/ui/portal-data-table";
import { LeadColumnSettingsBridge } from "@/components/leads/lead-column-settings-bridge";
import { LeadListTableShell } from "@/components/leads/lead-list-table-shell";
import { LeadViewsToolbar } from "@/components/leads/lead-views-toolbar";
import { PartnerLeadsTable } from "@/components/partner/partner-leads-table";
import { PartnersTableLayoutToggle } from "@/components/admin/partners-table-layout-toggle";
import { LeadToolbarColumnSettingsButton } from "@/components/leads/lead-table-column-picker-button";
import { usePortalDataTableLayout } from "@/hooks/use-portal-data-table-layout";
import { PARTNER_LEADS_TABLE_LAYOUT_KEY } from "@/lib/partner/partner-leads-table-display";
import type { LeadColumnDef } from "@/lib/leads/list-view-columns";
import type { LeadViewEditorState } from "@/components/leads/lead-view-editor-sheet";

type ViewRecord = {
  id: string;
  name: string;
  filters: unknown;
  sort: unknown;
  columns: unknown;
  isDefault: boolean;
};

type DeliveryRow = {
  id: string;
  price: number;
  channel: string;
  deliveredAt: string;
  refundedAt: string | null;
  canRefund: boolean;
  refundStatus: string | null;
  lead: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    state: string;
    address: string | null;
    leadType: string;
    intent: string | null;
    haveIul: string | null;
    primaryGoal: string | null;
    refundable: boolean;
    trustedformCertUrl: string | null;
  };
};

export function PartnerLeadsListClient({
  basePath,
  views,
  activeView,
  appliedDraft,
  catalog,
  partnerMeta,
  filterSummary,
  deliveries,
  columns,
  sort,
  pagination,
}: {
  basePath: string;
  views: ViewRecord[];
  activeView: ViewRecord;
  appliedDraft?: LeadViewEditorState | null;
  catalog: LeadColumnDef[];
  partnerMeta: {
    filterSets: { id: string; name: string }[];
    availableStates: string[];
  };
  filterSummary?: React.ReactNode;
  deliveries: DeliveryRow[];
  columns: PortalDataTableColumn[];
  sort: {
    active?: string;
    dir: "asc" | "desc";
    hrefBySortKey: Record<string, string>;
  };
  pagination?: React.ReactNode;
}) {
  const { layout, setLayout } = usePortalDataTableLayout(PARTNER_LEADS_TABLE_LAYOUT_KEY);

  const viewControls = (
    <>
      <PartnersTableLayoutToggle layout={layout} onLayoutChange={setLayout} />
      <LeadToolbarColumnSettingsButton />
    </>
  );

  return (
    <LeadColumnSettingsBridge>
      <LeadListTableShell
        layout={layout}
        pagination={pagination}
        isEmpty={deliveries.length === 0}
        emptyState={
          <EmptyState
            icon={FileText}
            title="No leads match this view"
            description="Try editing this view’s filters or create a new view."
            accent="orange"
          />
        }
        toolbar={
          <LeadViewsToolbar
            scope="partner"
            apiBase="/api/partner/lead-views"
            basePath={basePath}
            views={views}
            activeView={activeView}
            appliedDraft={appliedDraft}
            catalog={catalog}
            partnerMeta={partnerMeta}
            filterSummary={filterSummary}
            displayControls={viewControls}
          />
        }
      >
        <PartnerLeadsTable
          deliveries={deliveries}
          columns={columns}
          sort={sort}
          layout={layout}
          tableFooter={layout === "table" ? pagination : undefined}
        />
      </LeadListTableShell>
    </LeadColumnSettingsBridge>
  );
}
