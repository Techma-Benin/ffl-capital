"use client";

import { useEffect, useState } from "react";
import {
  US_REGION_STATES,
  US_STATE_CODES,
} from "@/lib/constants/us-states";
import type { AdminLeadViewFilters } from "@/lib/leads/list-view-schema";
import {
  MULTIPLE_CATEGORY_MATCH_TYPE_FILTER,
  UNCLASSIFIED_TYPE_FILTER,
} from "@/lib/leads/list-view-schema";
import { FilterChipGroup } from "@/components/leads/filter-chip-group";
import { LeadViewDatePeriodFilter } from "@/components/leads/lead-view-date-period-filter";

const STATE_OPTIONS = US_STATE_CODES.map((code) => ({
  value: code,
  label: code,
}));

type CategoryOption = { type: string; label: string };

export function AdminLeadViewFilterFields({
  filters,
  filterSets,
  onChange,
}: {
  filters: AdminLeadViewFilters;
  filterSets: { id: string; name: string }[];
  onChange: (patch: Partial<AdminLeadViewFilters>) => void;
}) {
  const selectedStates = filters.states ?? [];
  const selectedTypes = filters.types ?? [];
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/lead-categories");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setCategories(
          (data.categories ?? []).map((category: CategoryOption) => ({
            type: category.type,
            label: category.label,
          })),
        );
      } catch {
        // Non-blocking: type filter is optional.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function setStates(states: string[]) {
    onChange({ states: states.length ? states : undefined });
  }

  function toggleState(code: string) {
    const next = new Set(selectedStates);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setStates(Array.from(next).sort());
  }

  function toggleType(type: string) {
    const next = new Set(selectedTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    onChange({
      types: next.size ? Array.from(next).sort() : undefined,
    });
  }

  const typeOptions = [
    ...categories.map((category) => ({
      value: category.type,
      label: category.label,
    })),
    { value: UNCLASSIFIED_TYPE_FILTER, label: "Unclassified" },
    {
      value: MULTIPLE_CATEGORY_MATCH_TYPE_FILTER,
      label: "Multiple category match",
    },
  ];

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
          <option value="review">Review</option>
        </select>
      </div>
      <div>
        <label className="form-label text-[10px]">Filter set</label>
        <select
          className="form-select w-full text-sm"
          value={filters.filterSetId ?? ""}
          onChange={(e) =>
            onChange({ filterSetId: e.target.value || null })
          }
        >
          <option value="">All filter sets</option>
          {filterSets.map((filterSet) => (
            <option key={filterSet.id} value={filterSet.id}>
              {filterSet.name}
            </option>
          ))}
        </select>
      </div>
      <FilterChipGroup
        label="Type"
        options={typeOptions}
        selected={selectedTypes}
        onToggle={toggleType}
      />
      <FilterChipGroup
        label="States"
        options={STATE_OPTIONS}
        selected={selectedStates}
        onToggle={toggleState}
        scrollable
        header={
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-medium text-slate-500">
              {selectedStates.length} / {US_STATE_CODES.length} selected
              {selectedStates.length === 0 ? " (all states)" : ""}
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStates([...US_STATE_CODES])}
                className="btn-secondary btn-sm"
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStates([])}
                className="btn-secondary btn-sm"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setStates([...US_REGION_STATES.southeast])}
                className="btn-secondary btn-sm"
              >
                Southeast
              </button>
              <button
                type="button"
                onClick={() => setStates([...US_REGION_STATES.northeast])}
                className="btn-secondary btn-sm"
              >
                Northeast
              </button>
              <button
                type="button"
                onClick={() => setStates([...US_REGION_STATES.midwest])}
                className="btn-secondary btn-sm"
              >
                Midwest
              </button>
              <button
                type="button"
                onClick={() => setStates([...US_REGION_STATES.west])}
                className="btn-secondary btn-sm"
              >
                West
              </button>
            </div>
          </div>
        }
      />
      <LeadViewDatePeriodFilter
        datePeriod={filters.datePeriod}
        from={filters.from}
        to={filters.to}
        onChange={onChange}
      />
    </>
  );
}
