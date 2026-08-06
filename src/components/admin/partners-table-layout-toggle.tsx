"use client";

import { clsx } from "clsx";
import {
  SquaresFour,
  List as ListBullets,
  ICON_WEIGHT_LINEAR,
} from "@/lib/icons/client";
import type { PortalDataTableLayout } from "@/components/ui/portal-data-table";

const LAYOUT_OPTIONS = [
  {
    value: "cards" as const,
    label: "Cards layout",
    Icon: SquaresFour,
  },
  {
    value: "table" as const,
    label: "Table layout",
    Icon: ListBullets,
  },
] as const;

export function PartnersTableLayoutToggle({
  layout,
  onLayoutChange,
}: {
  layout: PortalDataTableLayout;
  onLayoutChange: (layout: PortalDataTableLayout) => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-slate-200 bg-transparent p-0.5"
      role="group"
      aria-label="Table layout"
    >
      {LAYOUT_OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onLayoutChange(value);
          }}
          className={clsx(
            "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            layout === value
              ? "bg-white text-slate-900 shadow-sm"
              : "bg-transparent text-slate-500 hover:bg-white/60 hover:text-slate-700",
          )}
          aria-pressed={layout === value}
          aria-label={label}
          title={label}
        >
          <Icon size={16} weight={ICON_WEIGHT_LINEAR} aria-hidden />
        </button>
      ))}
    </div>
  );
}
