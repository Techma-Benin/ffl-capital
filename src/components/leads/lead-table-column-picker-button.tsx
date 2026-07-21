"use client";

import { clsx } from "clsx";
import { SquaresFour, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";

/** Opens lead view column settings (same control as toolbar “Columns”). */
export function LeadTableColumnPickerButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={clsx(
        "mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-orange-600 transition-colors",
      )}
      aria-label="Choose columns to display"
    >
      <SquaresFour size={18} weight={ICON_WEIGHT_LINEAR} />
    </button>
  );
}
