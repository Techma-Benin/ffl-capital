"use client";

import { clsx } from "clsx";
import { X, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { FilterSelectDropdown } from "@/components/admin/filter-select-dropdown";
import {
  REFUND_DECISION_FILTER_OPTIONS,
  REFUND_TYPE_FILTER_OPTIONS,
  type RefundDecisionFilter,
  type RefundStateFilter,
  type RefundTypeFilter,
  type RefundTypeValue,
} from "@/lib/refunds/constants";

type FilterCounts<T extends string> = Partial<Record<T, number>> & { all: number };

const filterChipPressed =
  "border-slate-900 bg-slate-900 text-white";
const filterChipIdle =
  "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900";
const filterCountPressed = "bg-white/20 text-white";
const filterCountIdle = "bg-slate-100 text-slate-500";

function RefundFilterChipRow<T extends string>({
  options,
  value,
  onChange,
  counts,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  counts?: FilterCounts<T>;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex flex-wrap items-center gap-2"
    >
      {options.map((option) => {
        const pressed = value === option.value;
        const count = counts?.[option.value];

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(option.value)}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
              pressed ? filterChipPressed : filterChipIdle,
            )}
          >
            {option.label}
            {counts && count !== undefined && (
              <span
                className={clsx(
                  "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  pressed ? filterCountPressed : filterCountIdle,
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function RefundTableFilters({
  mode,
  typeValue,
  onTypeChange,
  typeCounts,
  decisionValue,
  onDecisionChange,
  decisionCounts,
  showDecision = false,
  stateValue,
  onStateChange,
  stateOptions,
  stateCounts,
}: {
  /** `pending`: Type + State category bar. `history`: Type + Decision category bar. */
  mode?: "pending" | "history";
  typeValue: RefundTypeFilter;
  onTypeChange: (next: RefundTypeFilter) => void;
  typeCounts?: FilterCounts<RefundTypeFilter | RefundTypeValue>;
  decisionValue?: RefundDecisionFilter;
  onDecisionChange?: (next: RefundDecisionFilter) => void;
  decisionCounts?: FilterCounts<RefundDecisionFilter>;
  showDecision?: boolean;
  stateValue?: RefundStateFilter;
  onStateChange?: (next: RefundStateFilter) => void;
  stateOptions?: { value: RefundStateFilter; label: string }[];
  stateCounts?: FilterCounts<string>;
}) {
  const isHistoryMode = mode === "history" || (mode === undefined && showDecision);
  const isPendingMode = mode === "pending";
  const isCategoryBarMode = isHistoryMode || isPendingMode;

  const typeActive = typeValue !== "all";
  const decisionActive =
    isHistoryMode &&
    decisionValue !== undefined &&
    decisionValue !== "all";
  const stateActive =
    isPendingMode && stateValue !== undefined && stateValue !== "all";
  const hasActiveFilters = typeActive || decisionActive || stateActive;

  function clearFilters() {
    onTypeChange("all");
    if (isHistoryMode && onDecisionChange) {
      onDecisionChange("all");
    }
    if (isPendingMode && onStateChange) {
      onStateChange("all");
    }
  }

  if (!isCategoryBarMode) {
    return (
      <div className="border-b border-slate-100 px-5 py-3">
        <RefundFilterChipRow
          options={REFUND_TYPE_FILTER_OPTIONS}
          value={typeValue}
          onChange={onTypeChange}
          counts={typeCounts}
          ariaLabel="Filter by refund type"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
      <FilterSelectDropdown
        id="admin-refunds-filter-type"
        dimensionLabel="Type"
        value={typeValue}
        allValue="all"
        options={REFUND_TYPE_FILTER_OPTIONS}
        counts={typeCounts}
        onChange={onTypeChange}
      />
      {isHistoryMode &&
        decisionValue !== undefined &&
        onDecisionChange !== undefined && (
          <FilterSelectDropdown
            id="admin-refunds-filter-decision"
            dimensionLabel="Decision"
            value={decisionValue}
            allValue="all"
            options={REFUND_DECISION_FILTER_OPTIONS}
            counts={decisionCounts}
            onChange={onDecisionChange}
          />
        )}
      {isPendingMode &&
        stateValue !== undefined &&
        onStateChange !== undefined &&
        stateOptions !== undefined && (
          <FilterSelectDropdown
            id="admin-refunds-filter-state"
            dimensionLabel="State"
            value={stateValue}
            allValue="all"
            options={stateOptions}
            counts={stateCounts}
            onChange={onStateChange}
            menuWidthClass="w-64"
          />
        )}
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
