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
import { notify } from "@/lib/notify";
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
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);

  const handleSelectedChange = useCallback((ids: Set<string>) => {
    setSelectedIds(ids);
  }, []);

  async function handleBulkReprocess() {
    if (bulkPending || selectedIds.size === 0) return;
    setBulkPending(true);
    try {
      const res = await fetch("/api/admin/leads/bulk-reprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error("Bulk reprocess failed");
      const data = (await res.json()) as { processed: number; errors: number };
      setSelectedIds(new Set());
      if (data.errors === 0) {
        notify.success(
          `${data.processed} lead${data.processed === 1 ? "" : "s"} queued for reprocessing.`,
        );
      } else {
        notify.error(`${data.processed} queued, ${data.errors} failed.`);
      }
      router.refresh();
    } catch {
      notify.error("Bulk reprocess failed. Please try again.");
    } finally {
      setBulkPending(false);
    }
  }

  const selectionAction =
    selectedIds.size > 0 ? (
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
          {selectedIds.size} selected
        </span>
        <button
          type="button"
          disabled={bulkPending}
          onClick={() => void handleBulkReprocess()}
          className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
        >
          <ArrowsClockwise size={13} className={bulkPending ? "animate-spin" : ""} />
          {bulkPending ? "Processing…" : `Reprocess (${selectedIds.size})`}
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
            catalog={catalog}
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
    </LeadColumnSettingsBridge>
  );
}
