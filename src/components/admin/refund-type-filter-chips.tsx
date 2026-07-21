"use client";

import { clsx } from "clsx";
import {
  REFUND_TYPE_FILTER_OPTIONS,
  type RefundTypeFilter,
  type RefundTypeValue,
} from "@/lib/refunds/constants";

export function RefundTypeFilterChips({
  value,
  onChange,
  counts,
  className,
}: {
  value: RefundTypeFilter;
  onChange: (next: RefundTypeFilter) => void;
  counts?: Partial<Record<RefundTypeFilter | RefundTypeValue, number>> & {
    all: number;
  };
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Filter by refund type"
      className={clsx(
        "flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3",
        className,
      )}
    >
      {REFUND_TYPE_FILTER_OPTIONS.map((option) => {
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
