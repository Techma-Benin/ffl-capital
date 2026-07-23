"use client";

import { clsx } from "clsx";

export function stateChipButtonClass(pressed: boolean) {
  return clsx(
    "rounded px-1 py-1.5 text-[10px] font-bold transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
    pressed
      ? "bg-brand-100 text-brand-700"
      : "bg-slate-50 text-slate-500 hover:bg-brand-50",
  );
}

export function StateChipGrid({
  options,
  selected,
  onToggle,
  ariaLabel,
  scrollable = true,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  ariaLabel: string;
  scrollable?: boolean;
}) {
  const selectedSet = new Set(selected);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={clsx(
        "grid grid-cols-5 gap-1.5 sm:grid-cols-10 rounded-lg border border-slate-200 bg-white p-2",
        scrollable && "max-h-44 overflow-y-auto",
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
            className={stateChipButtonClass(pressed)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
