"use client";

import { clsx } from "clsx";

export function FilterChipGroup({
  label,
  options,
  selected,
  onToggle,
  scrollable,
  header,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  /** Cap height with vertical scroll for long option lists (e.g. all US states). */
  scrollable?: boolean;
  /** Optional controls rendered between the label and chip row (e.g. bulk state presets). */
  header?: React.ReactNode;
}) {
  const selectedSet = new Set(selected);

  return (
    <div>
      <p className="form-label text-[10px]">{label}</p>
      {header}
      <div
        role="group"
        aria-label={label}
        className={clsx(
          "flex flex-wrap gap-2",
          scrollable &&
            "max-h-44 overflow-y-auto rounded-md border border-slate-100 p-2",
        )}
      >
        {options.map((o) => {
          const pressed = selectedSet.has(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={pressed}
              onClick={() => onToggle(o.value)}
              className={clsx(
                "inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                pressed
                  ? "bg-orange-600 text-white shadow-sm"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
