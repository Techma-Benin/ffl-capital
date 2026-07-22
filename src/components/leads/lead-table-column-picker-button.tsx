"use client";

import { clsx } from "clsx";
import { SquaresFour, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { useLeadColumnSettingsBridge } from "@/components/leads/lead-column-settings-bridge";

/** Opens lead view column settings (LeadColumnSettings sheet). */
export function LeadTableColumnPickerButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={clsx(
        "flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-orange-600",
        className,
      )}
      aria-label="Choose columns to display"
      title="Choose columns to display"
    >
      <SquaresFour size={18} weight={ICON_WEIGHT_LINEAR} />
    </button>
  );
}

/** Toolbar control — same behavior as the table header column picker. */
export function LeadToolbarColumnSettingsButton() {
  const columnSettingsBridge = useLeadColumnSettingsBridge();
  if (!columnSettingsBridge) return null;
  return (
    <LeadTableColumnPickerButton
      onClick={columnSettingsBridge.openColumnSettings}
      className="shrink-0"
    />
  );
}
