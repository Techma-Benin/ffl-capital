"use client";

import { useSearchParams } from "next/navigation";
import { X, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { FilterSelectDropdown } from "@/components/admin/filter-select-dropdown";
import { useNavigateWithPending } from "@/hooks/use-navigate-with-pending";
import {
  ADMIN_AGED_AGE_FILTER_OPTIONS,
  ADMIN_AGED_AGE_PARAM,
  ADMIN_AGED_STATE_PARAM,
  ADMIN_AGED_STATUS_FILTER_OPTIONS,
  ADMIN_AGED_STATUS_PARAM,
  ADMIN_AGED_TYPE_FILTER_OPTIONS,
  ADMIN_AGED_TYPE_PARAM,
  parseAdminAgedLeadFilters,
  type AdminAgedLeadAgeFilterValue,
  type AdminAgedLeadFilters,
  type AdminAgedLeadStatusFilter,
  type AdminAgedLeadTypeFilter,
} from "@/lib/admin/admin-aged-leads-filters";

const BASE_PATH = "/admin/aged";

const PRESERVED_PARAMS = new Set([
  "page",
  "sort",
  "dir",
  ADMIN_AGED_STATE_PARAM,
  ADMIN_AGED_TYPE_PARAM,
  ADMIN_AGED_STATUS_PARAM,
  ADMIN_AGED_AGE_PARAM,
]);

function navigateWithFilters(
  push: (href: string) => void,
  searchParams: URLSearchParams,
  next: AdminAgedLeadFilters,
) {
  const params = new URLSearchParams();
  searchParams.forEach((v, k) => {
    if (PRESERVED_PARAMS.has(k)) return;
    params.set(k, v);
  });
  if (next.states.length > 0) {
    params.set(ADMIN_AGED_STATE_PARAM, next.states.join(","));
  }
  if (next.type !== "all") params.set(ADMIN_AGED_TYPE_PARAM, next.type);
  if (next.status !== "all") {
    params.set(ADMIN_AGED_STATUS_PARAM, next.status);
  }
  if (next.age !== "all") params.set(ADMIN_AGED_AGE_PARAM, next.age);
  if (searchParams.get("sort")) params.set("sort", searchParams.get("sort")!);
  if (searchParams.get("dir")) params.set("dir", searchParams.get("dir")!);
  params.delete("page");
  const qs = params.toString();
  push(qs ? `${BASE_PATH}?${qs}` : BASE_PATH);
}

export function AdminAgedLeadsFilters({
  stateOptions,
  typeFilterOptions = ADMIN_AGED_TYPE_FILTER_OPTIONS,
}: {
  stateOptions: { value: string; label: string }[];
  typeFilterOptions?: { value: AdminAgedLeadTypeFilter; label: string }[];
}) {
  const { push } = useNavigateWithPending();
  const searchParams = useSearchParams();
  const knownTypes = typeFilterOptions
    .map((option) => option.value)
    .filter((value) => value !== "all");
  const filters = parseAdminAgedLeadFilters(
    {
      state: searchParams.get(ADMIN_AGED_STATE_PARAM) ?? undefined,
      type: searchParams.get(ADMIN_AGED_TYPE_PARAM) ?? undefined,
      status: searchParams.get(ADMIN_AGED_STATUS_PARAM) ?? undefined,
      age: searchParams.get(ADMIN_AGED_AGE_PARAM) ?? undefined,
    },
    knownTypes,
  );

  const hasActiveFilters =
    filters.states.length > 0 ||
    filters.type !== "all" ||
    filters.status !== "all" ||
    filters.age !== "all";

  function update(partial: Partial<AdminAgedLeadFilters>) {
    navigateWithFilters(push, searchParams, { ...filters, ...partial });
  }

  function clearFilters() {
    navigateWithFilters(push, searchParams, {
      states: [],
      type: "all",
      status: "all",
      age: "all",
    });
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <FilterSelectDropdown
        id="admin-aged-filter-state"
        dimensionLabel="State"
        accent="teal"
        selectionMode="multi"
        value={filters.states}
        allValue="all"
        options={stateOptions}
        onChange={(states) => update({ states })}
        menuWidthClass="w-64"
        searchable
      />
      <FilterSelectDropdown
        id="admin-aged-filter-type"
        dimensionLabel="Type"
        accent="teal"
        value={filters.type}
        allValue="all"
        options={typeFilterOptions}
        onChange={(type: AdminAgedLeadTypeFilter) => update({ type })}
        searchable={false}
      />
      <FilterSelectDropdown
        id="admin-aged-filter-status"
        dimensionLabel="Status"
        accent="teal"
        value={filters.status}
        allValue="all"
        options={ADMIN_AGED_STATUS_FILTER_OPTIONS}
        onChange={(status: AdminAgedLeadStatusFilter) => update({ status })}
        searchable={false}
      />
      <FilterSelectDropdown
        id="admin-aged-filter-age"
        dimensionLabel="Age"
        accent="teal"
        value={filters.age}
        allValue="all"
        options={ADMIN_AGED_AGE_FILTER_OPTIONS}
        onChange={(age: AdminAgedLeadAgeFilterValue) => update({ age })}
        searchable={false}
      />
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="ml-auto inline-flex items-center gap-1 rounded-sm text-xs text-slate-400 transition-colors hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
        >
          <X size={12} weight={ICON_WEIGHT_LINEAR} aria-hidden />
          Clear
        </button>
      )}
    </div>
  );
}
