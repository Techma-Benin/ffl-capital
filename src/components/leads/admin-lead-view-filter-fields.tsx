"use client";

import { useEffect, useState } from "react";
import {
  US_REGION_STATES,
  US_STATE_CODES,
} from "@/lib/constants/us-states";
import type {
  AdminDatePeriod,
  AdminLeadViewFilters,
} from "@/lib/leads/list-view-schema";
import { ADMIN_DATE_PERIOD_OPTIONS } from "@/lib/admin/admin-date-period";
import { FilterChipGroup } from "@/components/leads/filter-chip-group";

const STATE_OPTIONS = US_STATE_CODES.map((code) => ({
  value: code,
  label: code,
}));

type CategoryOption = { type: string; label: string };

export function AdminLeadViewFilterFields({
  filters,
  onChange,
}: {
  filters: AdminLeadViewFilters;
  onChange: (patch: Partial<AdminLeadViewFilters>) => void;
}) {
  const selectedStates = filters.states ?? [];
  const selectedCandidates = filters.categoryCandidateTypes ?? [];
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
        // Non-blocking: candidate filter is optional.
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

  function toggleCandidate(type: string) {
    const next = new Set(selectedCandidates);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    onChange({
      categoryCandidateTypes: next.size ? Array.from(next).sort() : undefined,
    });
  }

  const candidateOptions = categories.map((category) => ({
    value: category.type,
    label: category.label,
  }));

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
        <label className="form-label text-[10px]">Category resolution</label>
        <select
          className="form-select w-full text-sm"
          value={filters.categoryResolution ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            onChange({
              categoryResolution:
                value === "no_match" || value === "multiple_matches"
                  ? value
                  : undefined,
            });
          }}
        >
          <option value="">Any</option>
          <option value="no_match">No category match</option>
          <option value="multiple_matches">Multiple category matches</option>
        </select>
      </div>
      {candidateOptions.length > 0 && (
        <FilterChipGroup
          label="Candidate categories"
          options={candidateOptions}
          selected={selectedCandidates}
          onToggle={toggleCandidate}
          scrollable
        />
      )}
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
