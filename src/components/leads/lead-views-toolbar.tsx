"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { LeadViewSwitcher } from "@/components/leads/lead-view-switcher";
import { LeadViewActionsMenu } from "@/components/leads/lead-view-actions-menu";
import {
  LeadViewEditorSheet,
  type LeadViewEditorState,
} from "@/components/leads/lead-view-editor-sheet";
import { LeadColumnSettings } from "@/components/leads/lead-column-settings";
import type { LeadColumnDef } from "@/lib/leads/list-view-columns";
import type { LeadViewColumn, LeadViewSort } from "@/lib/leads/list-view-schema";
import {
  adminLeadViewFiltersSchema,
  parseAdminFilters,
  parsePartnerFilters,
  partnerLeadViewFiltersSchema,
} from "@/lib/leads/list-view-schema";
import { Funnel } from "@/lib/icons/client";

type ViewRecord = {
  id: string;
  name: string;
  filters: unknown;
  sort: unknown;
  columns: unknown;
  isDefault: boolean;
};

export function LeadViewsToolbar({
  scope,
  apiBase,
  basePath,
  views,
  activeView,
  catalog,
  sortOptions,
  partnerMeta,
  filterSummary,
  exportSlot,
}: {
  scope: "admin" | "partner";
  apiBase: string;
  basePath: string;
  views: ViewRecord[];
  activeView: ViewRecord;
  catalog: LeadColumnDef[];
  sortOptions: { value: string; label: string }[];
  partnerMeta?: {
    filterSets: { id: string; name: string }[];
    availableStates: string[];
  };
  filterSummary?: React.ReactNode;
  exportSlot?: React.ReactNode;
}) {
  const router = useRouter();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("edit");
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [draftColumns, setDraftColumns] = useState<LeadViewColumn[] | null>(
    null,
  );

  const columns =
    draftColumns ??
    (Array.isArray(activeView.columns)
      ? (activeView.columns as LeadViewColumn[])
      : []);

  const editorInitial = (): LeadViewEditorState => {
    if (editorMode === "create") {
      return {
        name: "",
        filters:
          scope === "admin"
            ? { statusSlice: "all" }
            : {},
        sort: (activeView.sort as LeadViewSort) ?? {
          field: scope === "admin" ? "receivedAt" : "deliveredAt",
          direction: "desc",
        },
        columns,
      };
    }
    return {
      name: activeView.name,
      filters:
        scope === "admin"
          ? parseAdminFilters(activeView.filters)
          : parsePartnerFilters(activeView.filters),
      sort: activeView.sort as LeadViewSort,
      columns,
    };
  };

  const refresh = useCallback(() => router.refresh(), [router]);

  async function apiPatch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`${apiBase}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Request failed");
    }
    return res.json();
  }

  async function saveView(state: LeadViewEditorState) {
    setPending(true);
    try {
      const filters =
        scope === "admin"
          ? adminLeadViewFiltersSchema.parse(state.filters)
          : partnerLeadViewFiltersSchema.parse(state.filters);

      if (editorMode === "create") {
        const res = await fetch(apiBase, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: state.name,
            filters,
            sort: state.sort,
            columns: state.columns,
          }),
        });
        if (!res.ok) throw new Error();
        const created = await res.json();
        router.push(`${basePath}?view=${created.id}`);
      } else {
        await apiPatch(activeView.id, {
          name: state.name,
          filters,
          sort: state.sort,
          columns: state.columns,
        });
        setDraftColumns(null);
        refresh();
      }
    } finally {
      setPending(false);
    }
  }

  async function saveColumnsOnly(next: LeadViewColumn[]) {
    setDraftColumns(next);
    setPending(true);
    try {
      await apiPatch(activeView.id, { columns: next });
      setDraftColumns(null);
      refresh();
    } finally {
      setPending(false);
    }
  }

  async function duplicateView() {
    const state = editorInitial();
    setPending(true);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${activeView.name} copy`,
          filters: state.filters,
          sort: state.sort,
          columns: state.columns,
        }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      router.push(`${basePath}?view=${created.id}`);
    } finally {
      setPending(false);
    }
  }

  async function setDefault() {
    setPending(true);
    try {
      await fetch(`${apiBase}/${activeView.id}/default`, { method: "POST" });
      refresh();
    } finally {
      setPending(false);
    }
  }

  async function deleteView() {
    if (!confirm(`Delete view “${activeView.name}”?`)) return;
    setPending(true);
    try {
      const res = await fetch(`${apiBase}/${activeView.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Could not delete");
        return;
      }
      const fallback = views.find((v) => v.isDefault && v.id !== activeView.id);
      router.push(`${basePath}?view=${fallback?.id ?? views[0]?.id}`);
      refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LeadViewSwitcher
          views={views}
          activeViewId={activeView.id}
          basePath={basePath}
          onNewView={() => {
            setEditorMode("create");
            setEditorOpen(true);
          }}
        />
        <div className="flex items-center gap-1">
          {exportSlot}
          <button
            type="button"
            className="btn-secondary btn-sm inline-flex items-center gap-1"
            onClick={() => setColumnsOpen(true)}
          >
            <Funnel size={14} />
            Columns
          </button>
          <LeadViewActionsMenu
            isDefault={activeView.isDefault}
            onRename={() => {
              setEditorMode("edit");
              setEditorOpen(true);
            }}
            onDuplicate={duplicateView}
            onSetDefault={setDefault}
            onDelete={deleteView}
          />
        </div>
      </div>
      {filterSummary}

      <LeadViewEditorSheet
        open={editorOpen}
        onOpenChange={setEditorOpen}
        scope={scope}
        mode={editorMode}
        initial={editorInitial()}
        catalog={catalog}
        sortOptions={sortOptions}
        partnerMeta={partnerMeta}
        onSave={saveView}
        pending={pending}
      />

      <LeadColumnSettings
        open={columnsOpen}
        onOpenChange={setColumnsOpen}
        catalog={catalog}
        columns={columns}
        onChange={saveColumnsOnly}
      />
    </div>
  );
}
