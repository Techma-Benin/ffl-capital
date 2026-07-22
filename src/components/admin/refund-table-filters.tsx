"use client";

import { useId, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { CaretDown, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import {
  REFUND_DECISION_FILTER_OPTIONS,
  REFUND_TYPE_FILTER_OPTIONS,
  type RefundDecisionFilter,
  type RefundTypeFilter,
  type RefundTypeValue,
} from "@/lib/refunds/constants";

type FilterCounts<T extends string> = Partial<Record<T, number>> & { all: number };

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
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
              pressed
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80",
            )}
          >
            {option.label}
            {counts && count !== undefined && (
              <span
                className={clsx(
                  "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  pressed ? "bg-white/20 text-white" : "bg-white text-slate-500",
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

function RefundFilterCollapsibleSection({
  title,
  defaultExpanded = true,
  children,
}: {
  title: string;
  defaultExpanded?: boolean;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const panelId = useId();
  const headerId = useId();

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        id={headerId}
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((open) => !open)}
        className={clsx(
          "flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors",
          "hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500",
        )}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </span>
        <CaretDown
          size={14}
          weight={ICON_WEIGHT_LINEAR}
          className={clsx(
            "shrink-0 text-slate-400 transition-transform",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {expanded && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className="px-5 pb-3"
        >
          {children}
        </div>
      )}
    </div>
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
  return (
    <div className="border-b border-slate-100">
      <RefundFilterCollapsibleSection title="Type" defaultExpanded>
        <RefundFilterChipRow
          options={REFUND_TYPE_FILTER_OPTIONS}
          value={typeValue}
          onChange={onTypeChange}
          counts={typeCounts}
          ariaLabel="Filter by refund type"
        />
      </RefundFilterCollapsibleSection>
      {showDecision &&
        decisionValue !== undefined &&
        onDecisionChange !== undefined && (
          <RefundFilterCollapsibleSection title="Decision" defaultExpanded={false}>
            <RefundFilterChipRow
              options={REFUND_DECISION_FILTER_OPTIONS}
              value={decisionValue}
              onChange={onDecisionChange}
              counts={decisionCounts}
              ariaLabel="Filter by refund decision"
            />
          </RefundFilterCollapsibleSection>
        )}
    </div>
  );
}
