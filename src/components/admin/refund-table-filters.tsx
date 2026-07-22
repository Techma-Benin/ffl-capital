"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { CaretDown, CaretUp, X, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import {
  REFUND_DECISION_FILTER_OPTIONS,
  REFUND_TYPE_FILTER_OPTIONS,
  type RefundDecisionFilter,
  type RefundTypeFilter,
  type RefundTypeValue,
} from "@/lib/refunds/constants";

type FilterCounts<T extends string> = Partial<Record<T, number>> & { all: number };

type OpenCategory = "type" | "decision";

const triggerActive =
  "border-brand-300 bg-brand-50 text-brand-700";
const triggerWithSelection =
  "border-brand-200 bg-brand-50/60 text-brand-600";
const triggerIdle =
  "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50";

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
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
              pressed
                ? "border-brand-400 bg-brand-50 text-brand-700"
                : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700",
            )}
          >
            {option.label}
            {counts && count !== undefined && (
              <span
                className={clsx(
                  "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  pressed
                    ? "bg-brand-100 text-brand-700"
                    : "bg-slate-100 text-slate-500",
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
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        isOpen
          ? triggerActive
          : hasSelection
            ? triggerWithSelection
            : triggerIdle,
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
  typeValue,
  onTypeChange,
  typeCounts,
  decisionValue,
  onDecisionChange,
  decisionCounts,
  showDecision = false,
}: {
  typeValue: RefundTypeFilter;
  onTypeChange: (next: RefundTypeFilter) => void;
  typeCounts?: FilterCounts<RefundTypeFilter | RefundTypeValue>;
  decisionValue?: RefundDecisionFilter;
  onDecisionChange?: (next: RefundDecisionFilter) => void;
  decisionCounts?: FilterCounts<RefundDecisionFilter>;
  showDecision?: boolean;
}) {
  const [openCategory, setOpenCategory] = useState<OpenCategory | null>("type");

  const showTypeChipRow = !showDecision || openCategory === "type";
  const showDecisionChipRow =
    showDecision && openCategory === "decision";

  const typeActive = typeValue !== "all";
  const decisionActive =
    showDecision && decisionValue !== undefined && decisionValue !== "all";
  const hasActiveFilters = typeActive || decisionActive;

  const typeSelectionLabel = optionLabel(REFUND_TYPE_FILTER_OPTIONS, typeValue);
  const decisionSelectionLabel =
    decisionValue !== undefined
      ? optionLabel(REFUND_DECISION_FILTER_OPTIONS, decisionValue)
      : null;

  const typeTriggerLabel = typeSelectionLabel
    ? `Type: ${typeSelectionLabel}`
    : "Type";
  const decisionTriggerLabel = decisionSelectionLabel
    ? `Decision: ${decisionSelectionLabel}`
    : "Decision";

  function toggleCategory(category: OpenCategory) {
    setOpenCategory((current) => {
      if (current === category) {
        // Pending tables only filter by type — keep the chip row visible.
        if (!showDecision && category === "type") return "type";
        return null;
      }
      return category;
    });
  }

  function clearFilters() {
    onTypeChange("all");
    if (showDecision && onDecisionChange) {
      onDecisionChange("all");
    }
    setOpenCategory("type");
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
        {showDecision &&
          decisionValue !== undefined &&
          onDecisionChange !== undefined && (
            <CategoryTrigger
              label={decisionTriggerLabel}
              isOpen={openCategory === "decision"}
              hasSelection={decisionActive}
              onClick={() => toggleCategory("decision")}
            />
          )}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded-sm"
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
    </div>
  );
}
