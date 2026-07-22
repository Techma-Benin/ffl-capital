"use client";

import { clsx } from "clsx";
import {
  SquaresFour,
  List as ListBullets,
  AddSquare,
  ICON_WEIGHT_LINEAR,
} from "@/lib/icons/client";
import type { PortalDataTableLayout } from "@/components/ui/portal-data-table";

const LAYOUT_OPTIONS = [
  {
    value: "cards" as const,
    label: "Cards layout",
    Icon: AddSquare,
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
  onOpenColumnSettings,
}: {
  layout?: PortalDataTableLayout;
  onLayoutChange?: (layout: PortalDataTableLayout) => void;
  /** Opens lead view column settings (LeadColumnSettings sheet). */
  onOpenColumnSettings?: () => void;
}) {
  const showLayoutToggle =
    layout != null && onLayoutChange != null;

  return (
    <div className="inline-flex items-center gap-2">
      {onOpenColumnSettings ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenColumnSettings();
          }}
          className={clsx(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-orange-600",
          )}
          aria-label="Choose columns to display"
          title="Choose columns to display"
        >
          <SquaresFour size={18} weight={ICON_WEIGHT_LINEAR} aria-hidden />
        </button>
      ) : null}
      {showLayoutToggle ? (
        <div
          className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"
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
                  : "text-slate-500 hover:text-slate-700",
              )}
              aria-pressed={layout === value}
              aria-label={label}
              title={label}
            >
              <Icon size={16} weight={ICON_WEIGHT_LINEAR} aria-hidden />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
