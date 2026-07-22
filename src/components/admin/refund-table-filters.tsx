"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { CaretDown, CaretUp, X, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import {
  REFUND_DECISION_FILTER_OPTIONS,
  REFUND_TYPE_FILTER_OPTIONS,
  type RefundDecisionFilter,
  type RefundStateFilter,
  type RefundTypeFilter,
  type RefundTypeValue,
} from "@/lib/refunds/constants";

type FilterCounts<T extends string> = Partial<Record<T, number>> & { all: number };

type OpenCategory = "type" | "decision" | "state";

/** Category triggers + active chips — neutral black/slate active state. */
const filterTriggerActive =
  "border-slate-900 bg-slate-900 text-white";
const filterTriggerIdle =
  "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50";

const filterChipPressed =
  "border-slate-900 bg-slate-900 text-white";
const filterChipIdle =
  "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900";
const filterCountPressed = "bg-white/20 text-white";
const filterCountIdle = "bg-slate-100 text-slate-500";

function optionLabel<T extends string>(
  options: { value: T; label: string }[],
  value: T,
): string | null {
  if (value === "all") return null;
  return options.find((o) => o.value === value)?.label ?? null;
}

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

function CategoryTrigger({
  label,
  isOpen,
  hasSelection,
  onClick,
}: {
  label: string;
  isOpen: boolean;
  hasSelection: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={isOpen}
      onClick={onClick}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
        isOpen || hasSelection ? filterTriggerActive : filterTriggerIdle,
      )}
    >
      {label}
      {isOpen ? (
        <CaretUp size={12} weight={ICON_WEIGHT_LINEAR} aria-hidden />
      ) : (
        <CaretDown size={12} weight={ICON_WEIGHT_LINEAR} aria-hidden />
      )}
    </button>
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

  const [openCategory, setOpenCategory] = useState<OpenCategory | null>("type");

  const showTypeChipRow = !isCategoryBarMode || openCategory === "type";
  const showDecisionChipRow =
    isHistoryMode && openCategory === "decision";
  const showStateChipRow =
    isPendingMode &&
    openCategory === "state" &&
    stateValue !== undefined &&
    onStateChange !== undefined &&
    stateOptions !== undefined;

  const typeActive = typeValue !== "all";
  const decisionActive =
    isHistoryMode &&
    decisionValue !== undefined &&
    decisionValue !== "all";
  const stateActive =
    isPendingMode && stateValue !== undefined && stateValue !== "all";
  const hasActiveFilters = typeActive || decisionActive || stateActive;

  const typeSelectionLabel = optionLabel(REFUND_TYPE_FILTER_OPTIONS, typeValue);
  const decisionSelectionLabel =
    decisionValue !== undefined
      ? optionLabel(REFUND_DECISION_FILTER_OPTIONS, decisionValue)
      : null;
  const stateSelectionLabel =
    stateValue !== undefined && stateValue !== "all" ? stateValue : null;

  const typeTriggerLabel = typeSelectionLabel
    ? `Type: ${typeSelectionLabel}`
    : "Type";
  const decisionTriggerLabel = decisionSelectionLabel
    ? `Decision: ${decisionSelectionLabel}`
    : "Decision";
  const stateTriggerLabel = stateSelectionLabel
    ? `State: ${stateSelectionLabel}`
    : "State";

  function toggleCategory(category: OpenCategory) {
    setOpenCategory((current) => (current === category ? null : category));
  }

  function clearFilters() {
    onTypeChange("all");
    if (isHistoryMode && onDecisionChange) {
      onDecisionChange("all");
    }
    if (isPendingMode && onStateChange) {
      onStateChange("all");
    }
    setOpenCategory("type");
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
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
        <CategoryTrigger
          label={typeTriggerLabel}
          isOpen={openCategory === "type"}
          hasSelection={typeActive}
          onClick={() => toggleCategory("type")}
        />
        {isHistoryMode &&
          decisionValue !== undefined &&
          onDecisionChange !== undefined && (
            <CategoryTrigger
              label={decisionTriggerLabel}
              isOpen={openCategory === "decision"}
              hasSelection={decisionActive}
              onClick={() => toggleCategory("decision")}
            />
          )}
        {isPendingMode &&
          stateValue !== undefined &&
          onStateChange !== undefined && (
            <CategoryTrigger
              label={stateTriggerLabel}
              isOpen={openCategory === "state"}
              hasSelection={stateActive}
              onClick={() => toggleCategory("state")}
            />
          )}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 rounded-sm"
          >
            <X size={12} weight={ICON_WEIGHT_LINEAR} aria-hidden />
            Clear
          </button>
        )}
      </div>

      {showTypeChipRow && (
        <div className="border-b border-slate-100 px-5 py-3">
          <RefundFilterChipRow
            options={REFUND_TYPE_FILTER_OPTIONS}
            value={typeValue}
            onChange={onTypeChange}
            counts={typeCounts}
            ariaLabel="Filter by refund type"
          />
        </div>
      )}

      {showDecisionChipRow &&
        decisionValue !== undefined &&
        onDecisionChange !== undefined && (
          <div className="border-b border-slate-100 px-5 py-3">
            <RefundFilterChipRow
              options={REFUND_DECISION_FILTER_OPTIONS}
              value={decisionValue}
              onChange={onDecisionChange}
              counts={decisionCounts}
              ariaLabel="Filter by refund decision"
            />
          </div>
        )}

      {showStateChipRow && stateOptions !== undefined && (
        <div className="border-b border-slate-100 px-5 py-3">
          <RefundFilterChipRow
            options={stateOptions}
            value={stateValue!}
            onChange={onStateChange!}
            counts={stateCounts}
            ariaLabel="Filter by lead state"
          />
        </div>
      )}
    </div>
  );
}
