"use client";

import { clsx } from "clsx";
import type { PartnersTableLayout } from "@/lib/admin/partners-table-columns";

export function PartnersTableLayoutToggle({
  layout,
  onLayoutChange,
}: {
  layout: PartnersTableLayout;
  onLayoutChange: (layout: PartnersTableLayout) => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"
      role="group"
      aria-label="Table layout"
    >
      {(
        [
          { value: "cards" as const, label: "Cards" },
          { value: "table" as const, label: "Table" },
        ] as const
      ).map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onLayoutChange(value);
          }}
          className={clsx(
            "rounded-md px-2 py-1 text-[11px] font-semibold transition-colors",
            layout === value
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700",
          )}
          aria-pressed={layout === value}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
