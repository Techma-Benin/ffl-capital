"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileText, ArrowsClockwise } from "@/lib/icons/client";
import { EmptyState } from "@/components/ui/empty-state";
import type { PortalDataTableColumn } from "@/components/ui/portal-data-table";
import { LeadListTableShell } from "@/components/leads/lead-list-table-shell";
import { LeadColumnSettingsBridge } from "@/components/leads/lead-column-settings-bridge";
import { LeadViewsToolbar } from "@/components/leads/lead-views-toolbar";
import { AdminLeadsTable } from "@/components/admin/admin-leads-table";
import { PartnersTableLayoutToggle } from "@/components/admin/partners-table-layout-toggle";
import { useAdminLeadsTableLayout } from "@/components/admin/use-admin-leads-table-layout";
import { LeadToolbarColumnSettingsButton } from "@/components/leads/lead-table-column-picker-button";
import { BulkReprocessPartnersDialog } from "@/components/admin/bulk-reprocess-partners-dialog";
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

type LeadRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  state: string;
  leadType: string;
  leadTypeLabel: string;
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
  appliedDraft,
  catalog,
  filterSets,
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
  appliedDraft?: LeadViewEditorState | null;
  catalog: LeadColumnDef[];
  filterSets: { id: string; name: string }[];
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
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reprocessDialogOpen, setReprocessDialogOpen] = useState(false);

  const handleSelectedChange = useCallback((ids: Set<string>) => {
    setSelectedIds(ids);
  }, []);

  function handleBulkReprocessClick() {
    if (selectedIds.size === 0) return;
    setReprocessDialogOpen(true);
  }

  function handleReprocessSuccess() {
    setSelectedIds(new Set());
    router.refresh();
  }

  const selectionAction =
    selectedIds.size > 0 ? (
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
          {selectedIds.size} selected
        </span>
        <button
          type="button"
          disabled={reprocessDialogOpen}
          onClick={handleBulkReprocessClick}
          className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
        >
          <ArrowsClockwise size={13} />
          {`Reprocess (${selectedIds.size})`}
        </button>
        <button
          type="button"
          onClick={() => setSelectedIds(new Set())}
          className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          Clear
        </button>
      </div>
    ) : null;

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
        isEmpty={leads.length === 0}
        emptyState={
          <EmptyState
            icon={FileText}
            title="No leads found"
            description="Try editing this view's filters or create a new view."
            accent="orange"
          />
        }
        toolbar={
          <LeadViewsToolbar
            scope="admin"
            apiBase="/api/admin/lead-views"
            basePath={basePath}
            views={views}
            activeView={activeView}
            appliedDraft={appliedDraft}
            catalog={catalog}
            adminFilterSets={filterSets}
            filterSummary={filterSummary}
            exportSlot={exportSlot}
            displayControls={viewControls}
            selectionAction={selectionAction}
          />
        }
      >
        <AdminLeadsTable
          leads={leads}
          columns={columns}
          sort={sort}
          layout={layout}
          tableFooter={layout === "table" ? pagination : undefined}
          selectedIds={selectedIds}
          onSelectedChange={handleSelectedChange}
        />
      </LeadListTableShell>
      <BulkReprocessPartnersDialog
        open={reprocessDialogOpen}
        onOpenChange={setReprocessDialogOpen}
        leadIds={Array.from(selectedIds)}
        leadCount={selectedIds.size}
        onSuccess={handleReprocessSuccess}
      />
    </LeadColumnSettingsBridge>
  );
}
