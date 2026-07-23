"use client";

import { US_STATE_CODES } from "@/lib/constants/us-states";
import type { PartnerLeadViewFilters } from "@/lib/leads/list-view-schema";
import { FilterCheckboxGroup } from "@/components/leads/filter-checkbox-group";

const LOCATION_OPTIONS = US_STATE_CODES.map((code) => ({
  value: code,
  label: code,
}));

const CHANNEL_OPTIONS = [
  { value: "realtime", label: "Real-time" },
  { value: "aged", label: "Aged" },
] as const;

const TYPE_OPTIONS = [
  { value: "traditional_iul", label: "Trad. IUL" },
  { value: "high_intent_iul", label: "High Intent" },
] as const;

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "refund_pending", label: "Refund pending" },
  { value: "refunded", label: "Refunded" },
] as const;

export function PartnerLeadViewFilterFields({
  filters,
  filterSets,
  onChange,
}: {
  filters: PartnerLeadViewFilters;
  filterSets: { id: string; name: string }[];
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
          {filterSets.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>
      <FilterCheckboxGroup
        label="Locations"
        options={LOCATION_OPTIONS}
        selected={filters.locations ?? []}
        onToggle={(v) => toggleArray("locations", v)}
        scrollable
      />
      <FilterCheckboxGroup
        label="Channel"
        options={[...CHANNEL_OPTIONS]}
        selected={filters.channels ?? []}
        onToggle={(v) => toggleArray("channels", v)}
      />
      <FilterCheckboxGroup
        label="Type"
        options={[...TYPE_OPTIONS]}
        selected={filters.types ?? []}
        onToggle={(v) => toggleArray("types", v)}
      />
      <FilterCheckboxGroup
        label="Status"
        options={[...STATUS_OPTIONS]}
        selected={filters.statuses ?? []}
        onToggle={(v) => toggleArray("statuses", v)}
      />
    </>
  );
}
