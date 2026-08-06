"use client";

import { useEffect, useState } from "react";
import { US_STATE_CODES } from "@/lib/constants/us-states";
import type { PartnerLeadViewFilters } from "@/lib/leads/list-view-schema";
import { FilterChipGroup } from "@/components/leads/filter-chip-group";
import { LeadViewDatePeriodFilter } from "@/components/leads/lead-view-date-period-filter";

const LOCATION_OPTIONS = US_STATE_CODES.map((code) => ({
  value: code,
  label: code,
}));

const CHANNEL_OPTIONS = [
  { value: "realtime", label: "Real-time" },
  { value: "aged", label: "Aged" },
] as const;

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "refund_pending", label: "Refund pending" },
  { value: "refunded", label: "Refunded" },
] as const;

type CategoryOption = { type: string; label: string };

export function PartnerLeadViewFilterFields({
  filters,
  filterSets,
  onChange,
}: {
  filters: PartnerLeadViewFilters;
  filterSets: { id: string; name: string }[];
  onChange: (patch: Partial<PartnerLeadViewFilters>) => void;
}) {
  const [typeOptions, setTypeOptions] = useState<CategoryOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/lead-categories");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setTypeOptions(
          (data.categories ?? []).map((category: CategoryOption) => ({
            type: category.type,
            label: category.label,
          })),
        );
      } catch {
        // optional filter
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
          {filterSets.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>
      <FilterChipGroup
        label="Locations"
        options={LOCATION_OPTIONS}
        selected={filters.locations ?? []}
        onToggle={(v) => toggleArray("locations", v)}
        scrollable
      />
      <FilterChipGroup
        label="Channel"
        options={[...CHANNEL_OPTIONS]}
        selected={filters.channels ?? []}
        onToggle={(v) => toggleArray("channels", v)}
      />
      <FilterChipGroup
        label="Type"
        options={typeOptions.map((option) => ({
          value: option.type,
          label: option.label,
        }))}
        selected={filters.types ?? []}
        onToggle={(v) => toggleArray("types", v)}
      />
      <FilterChipGroup
        label="Status"
        options={[...STATUS_OPTIONS]}
        selected={filters.statuses ?? []}
        onToggle={(v) => toggleArray("statuses", v)}
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
