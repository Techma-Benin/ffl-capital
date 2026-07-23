"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet, SheetBody } from "@/components/ui/sheet";
import type { LeadColumnDef } from "@/lib/leads/list-view-columns";
import type {
  AdminLeadViewFilters,
  LeadViewColumn,
  PartnerLeadViewFilters,
} from "@/lib/leads/list-view-schema";
import { LeadColumnSettings } from "@/components/leads/lead-column-settings";
import { AdminLeadViewFilterFields } from "@/components/leads/admin-lead-view-filter-fields";
import { PartnerLeadViewFilterFields } from "@/components/leads/partner-lead-view-filter-fields";

type Scope = "admin" | "partner";

export type LeadViewEditorState = {
  name: string;
  filters: AdminLeadViewFilters | PartnerLeadViewFilters;
  columns: LeadViewColumn[];
};

function cloneEditorState(initial: LeadViewEditorState): LeadViewEditorState {
  return {
    name: initial.name,
    filters: { ...initial.filters },
    columns: initial.columns.map((c) => ({ ...c })),
  };
}

export function LeadViewEditorSheet({
  open,
  onOpenChange,
  scope,
  mode,
  initial,
  catalog,
  partnerFilterSets,
  onSave,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: Scope;
  mode: "create" | "edit";
  initial: LeadViewEditorState;
  catalog: LeadColumnDef[];
  /** Partner scope only: filter sets for the filter-set dropdown. */
  partnerFilterSets?: { id: string; name: string }[];
  onSave: (state: LeadViewEditorState) => Promise<void>;
  pending?: boolean;
}) {
  const [state, setState] = useState(() => cloneEditorState(initial));
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialRef = useRef(initial);
  initialRef.current = initial;

  useEffect(() => {
    if (!open) return;
    setState(cloneEditorState(initialRef.current));
    setError(null);
    setColumnsOpen(false);
  }, [open]);

  function setFilters(
    patch: Partial<AdminLeadViewFilters & PartnerLeadViewFilters>,
  ) {
    setState((s) => ({ ...s, filters: { ...s.filters, ...patch } }));
  }

  async function submit() {
    setError(null);
    if (!state.name.trim()) {
      setError("Name is required");
      return;
    }
    try {
      await onSave(state);
      onOpenChange(false);
    } catch {
      setError("Could not save view");
    }
  }

  const adminFilters = scope === "admin" ? (state.filters as AdminLeadViewFilters) : null;
  const partnerFilters =
    scope === "partner" ? (state.filters as PartnerLeadViewFilters) : null;

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title={mode === "create" ? "New view" : "Edit view"}
        description="Configure filters and columns for this list view"
      >
        <SheetBody>
          <div className="space-y-4">
            <div>
              <label className="form-label">Name</label>
              <input
                className="form-input w-full text-sm"
                value={state.name}
                onChange={(e) =>
                  setState((s) => ({ ...s, name: e.target.value }))
                }
              />
            </div>

            {scope === "admin" && adminFilters && (
              <AdminLeadViewFilterFields
                filters={adminFilters}
                onChange={setFilters}
              />
            )}

            {scope === "partner" && partnerFilters && partnerFilterSets && (
              <PartnerLeadViewFilterFields
                filters={partnerFilters}
                filterSets={partnerFilterSets}
                onChange={setFilters}
              />
            )}

            <button
              type="button"
              className="btn-secondary btn-sm w-full"
              onClick={() => setColumnsOpen(true)}
            >
              Configure columns…
            </button>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={pending}
                onClick={submit}
              >
                {pending ? "Saving…" : "Save view"}
              </button>
            </div>
          </div>
        </SheetBody>
      </Sheet>

      <LeadColumnSettings
        key={`${mode}-${open}`}
        open={columnsOpen}
        onOpenChange={setColumnsOpen}
        catalog={catalog}
        columns={state.columns}
        onChange={(columns) => setState((s) => ({ ...s, columns }))}
      />
    </>
  );
}
