"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet, SheetBody } from "@/components/ui/sheet";
import { TargetStatesGrid } from "@/components/filter-sets/target-states-grid";
import type { LeadColumnDef } from "@/lib/leads/list-view-columns";
import type {
  AdminDatePeriod,
  AdminLeadViewFilters,
  LeadViewColumn,
  PartnerLeadViewFilters,
} from "@/lib/leads/list-view-schema";
import { ADMIN_DATE_PERIOD_OPTIONS } from "@/lib/admin/admin-date-period";
import { LeadColumnSettings } from "@/components/leads/lead-column-settings";

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
  partnerMeta,
  onSave,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: Scope;
  mode: "create" | "edit";
  initial: LeadViewEditorState;
  catalog: LeadColumnDef[];
  partnerMeta?: {
    filterSets: { id: string; name: string }[];
    availableStates: string[];
  };
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
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Filters
                </p>
                <div>
                  <label className="form-label text-[10px]">Status slice</label>
                  <select
                    className="form-select w-full text-sm"
                    value={adminFilters.statusSlice ?? "all"}
                    onChange={(e) =>
                      setFilters({
                        statusSlice: e.target.value as AdminLeadViewFilters["statusSlice"],
                      })
                    }
                  >
                    <option value="all">All leads</option>
                    <option value="matched">Matched</option>
                    <option value="unmatched">Unmatched</option>
                    <option value="integrity_posted">Integrity</option>
                    <option value="aged_listed">Aged listed</option>
                  </select>
                </div>
                <div>
                  <label className="form-label text-[10px]">States</label>
                  <TargetStatesGrid
                    selected={adminFilters.states ?? []}
                    onChange={(states) =>
                      setFilters({ states: states.length ? states : undefined })
                    }
                  />
                </div>
                <div>
                  <label className="form-label text-[10px]">Date period</label>
                  <select
                    className="form-select w-full text-sm"
                    value={adminFilters.datePeriod ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!value) {
                        setFilters({
                          datePeriod: undefined,
                          from: undefined,
                          to: undefined,
                        });
                        return;
                      }
                      if (value === "custom") {
                        setFilters({ datePeriod: "custom" });
                        return;
                      }
                      setFilters({
                        datePeriod: value as AdminDatePeriod,
                        from: undefined,
                        to: undefined,
                      });
                    }}
                  >
                    {ADMIN_DATE_PERIOD_OPTIONS.map((o) => (
                      <option key={o.value || "none"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {adminFilters.datePeriod === "custom" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="form-label text-[10px]">From</label>
                      <input
                        type="date"
                        className="form-input w-full text-sm"
                        value={adminFilters.from ?? ""}
                        onChange={(e) =>
                          setFilters({ from: e.target.value || undefined })
                        }
                      />
                    </div>
                    <div>
                      <label className="form-label text-[10px]">To</label>
                      <input
                        type="date"
                        className="form-input w-full text-sm"
                        value={adminFilters.to ?? ""}
                        onChange={(e) =>
                          setFilters({ to: e.target.value || undefined })
                        }
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {scope === "partner" && partnerFilters && partnerMeta && (
              <PartnerFilterFields
                filters={partnerFilters}
                meta={partnerMeta}
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

function PartnerFilterFields({
  filters,
  meta,
  onChange,
}: {
  filters: PartnerLeadViewFilters;
  meta: {
    filterSets: { id: string; name: string }[];
    availableStates: string[];
  };
  onChange: (patch: Partial<PartnerLeadViewFilters>) => void;
}) {
  function toggleArray(
    key: "locations" | "channels" | "types" | "statuses",
    value: string,
  ) {
    const current = filters[key] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ [key]: next.length ? next : undefined });
  }

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Filters
      </p>
      <div>
        <label className="form-label text-[10px]">Filter set</label>
        <select
          className="form-select w-full text-sm"
          value={filters.filterSetId ?? ""}
          onChange={(e) =>
            onChange({
              filterSetId: e.target.value || null,
            })
          }
        >
          <option value="">All filter sets</option>
          {meta.filterSets.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>
      <CheckboxGroup
        label="Locations"
        options={meta.availableStates.map((s) => ({ value: s, label: s }))}
        selected={filters.locations ?? []}
        onToggle={(v) => toggleArray("locations", v)}
      />
      <CheckboxGroup
        label="Channel"
        options={[
          { value: "realtime", label: "Real-time" },
          { value: "aged", label: "Aged" },
        ]}
        selected={filters.channels ?? []}
        onToggle={(v) => toggleArray("channels", v)}
      />
      <CheckboxGroup
        label="Type"
        options={[
          { value: "traditional_iul", label: "Trad. IUL" },
          { value: "high_intent_iul", label: "High Intent" },
        ]}
        selected={filters.types ?? []}
        onToggle={(v) => toggleArray("types", v)}
      />
      <CheckboxGroup
        label="Status"
        options={[
          { value: "active", label: "Active" },
          { value: "refund_pending", label: "Refund pending" },
          { value: "refunded", label: "Refunded" },
        ]}
        selected={filters.statuses ?? []}
        onToggle={(v) => toggleArray("statuses", v)}
      />
    </>
  );
}

function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <p className="form-label text-[10px]">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs"
          >
            <input
              type="checkbox"
              checked={selected.includes(o.value)}
              onChange={() => onToggle(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  );
}
