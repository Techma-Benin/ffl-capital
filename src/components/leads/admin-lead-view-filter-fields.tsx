"use client";

import { TargetStatesGrid } from "@/components/filter-sets/target-states-grid";
import type {
  AdminDatePeriod,
  AdminLeadViewFilters,
} from "@/lib/leads/list-view-schema";
import { ADMIN_DATE_PERIOD_OPTIONS } from "@/lib/admin/admin-date-period";

export function AdminLeadViewFilterFields({
  filters,
  onChange,
}: {
  filters: AdminLeadViewFilters;
  onChange: (patch: Partial<AdminLeadViewFilters>) => void;
}) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Filters
      </p>
      <div>
        <label className="form-label text-[10px]">Status slice</label>
        <select
          className="form-select w-full text-sm"
          value={filters.statusSlice ?? "all"}
          onChange={(e) =>
            onChange({
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
          selected={filters.states ?? []}
          onChange={(states) =>
            onChange({ states: states.length ? states : undefined })
          }
        />
      </div>
      <div>
        <label className="form-label text-[10px]">Date period</label>
        <select
          className="form-select w-full text-sm"
          value={filters.datePeriod ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            if (!value) {
              onChange({
                datePeriod: undefined,
                from: undefined,
                to: undefined,
              });
              return;
            }
            if (value === "custom") {
              onChange({ datePeriod: "custom" });
              return;
            }
            onChange({
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
      {filters.datePeriod === "custom" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="form-label text-[10px]">From</label>
            <input
              type="date"
              className="form-input w-full text-sm"
              value={filters.from ?? ""}
              onChange={(e) =>
                onChange({ from: e.target.value || undefined })
              }
            />
          </div>
          <div>
            <label className="form-label text-[10px]">To</label>
            <input
              type="date"
              className="form-input w-full text-sm"
              value={filters.to ?? ""}
              onChange={(e) => onChange({ to: e.target.value || undefined })}
            />
          </div>
        </div>
      )}
    </>
  );
}
