"use client";

import { clsx } from "clsx";

export function stateChipButtonClass(
  pressed: boolean,
  variant: "default" | "editor" = "default",
) {
  return clsx(
    variant === "editor"
      ? "rounded-lg px-1 py-2 text-[11px] font-bold transition-colors"
      : "rounded px-1 py-1.5 text-[10px] font-bold transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
    variant === "editor"
      ? pressed
        ? "bg-brand-100 text-brand-700 hover:bg-brand-200/70"
        : "bg-slate-50 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
      : pressed
        ? "bg-brand-100 text-brand-700"
        : "bg-slate-50 text-slate-500 hover:bg-brand-50",
  );
}

export function StateChipGrid({
  options,
  selected,
  onToggle,
  ariaLabel,
  scrollable = false,
  variant = "default",
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  ariaLabel: string;
  /** When true, caps height with an inner vertical scroll (dense modals). */
  scrollable?: boolean;
  variant?: "default" | "editor";
}) {
  const selectedSet = new Set(selected);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={clsx(
        "grid grid-cols-5 gap-1.5 border border-slate-200 bg-white sm:grid-cols-10",
        variant === "editor" ? "rounded-xl p-2.5" : "rounded-lg p-2",
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
            className={stateChipButtonClass(pressed, variant)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
