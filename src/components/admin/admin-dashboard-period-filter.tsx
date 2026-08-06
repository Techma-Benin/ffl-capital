"use client";

import { useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { AdminDatePeriod } from "@/lib/leads/list-view-schema";
import { ADMIN_DASHBOARD_PERIOD_OPTIONS } from "@/lib/admin/admin-date-period";
import { useNavigateWithPending } from "@/hooks/use-navigate-with-pending";
import { AdminDateRangePopover } from "@/components/admin/admin-date-range-popover";

type PeriodNavigateInput = {
  period?: AdminDatePeriod;
  from?: string;
  to?: string;
  clearDates?: boolean;
};

export function AdminDashboardPeriodFilter({
  datePeriod,
  from,
  to,
  periodDisplayLabel,
  onPeriodChange,
}: {
  datePeriod: AdminDatePeriod;
  from?: string;
  to?: string;
  periodDisplayLabel?: string;
  /** When set, updates period client-side (no full navigation / DB refetch). */
  onPeriodChange?: (next: PeriodNavigateInput & { period: AdminDatePeriod }) => void;
}) {
  const { push } = useNavigateWithPending();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const mayReselectCustom = useRef(false);

  function applyPeriod(next: PeriodNavigateInput) {
    const period = next.period ?? datePeriod;

    if (onPeriodChange) {
      onPeriodChange({ ...next, period });
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);

    if (next.clearDates || period !== "custom") {
      params.delete("from");
      params.delete("to");
    }

    const fromVal = next.from !== undefined ? next.from : from;
    const toVal = next.to !== undefined ? next.to : to;

    if (period === "custom") {
      if (fromVal) params.set("from", fromVal);
      else params.delete("from");
      if (toVal) params.set("to", toVal);
      else params.delete("to");
    }

    const qs = params.toString();
    push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div
      ref={anchorRef}
      className="relative flex shrink-0 flex-nowrap items-center justify-end gap-2"
    >
      {datePeriod === "custom" && (from || to) && periodDisplayLabel ? (
        <span
          className="shrink-0 whitespace-nowrap text-sm text-slate-500"
          aria-live="polite"
        >
          {periodDisplayLabel}
        </span>
      ) : null}
      <label className="sr-only" htmlFor="admin-dashboard-period">
        Period
      </label>
      <select
        id="admin-dashboard-period"
        className="form-select min-w-[160px] py-1.5 text-sm"
        value={
          customPickerOpen && datePeriod !== "custom" ? "custom" : datePeriod
        }
        onMouseDown={() => {
          if (datePeriod === "custom") {
            mayReselectCustom.current = true;
          }
        }}
        onMouseUp={() => {
          if (!mayReselectCustom.current) return;
          mayReselectCustom.current = false;
          if (datePeriod === "custom") {
            setCustomPickerOpen(true);
          }
        }}
        onBlur={() => {
          mayReselectCustom.current = false;
        }}
        onChange={(e) => {
          mayReselectCustom.current = false;
          const value = e.target.value as AdminDatePeriod;
          if (value === "custom") {
            setCustomPickerOpen(true);
            return;
          }
          setCustomPickerOpen(false);
          applyPeriod({ period: value, clearDates: true });
        }}
      >
        {ADMIN_DASHBOARD_PERIOD_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {customPickerOpen && (
        <AdminDateRangePopover
          hideTrigger
          anchorRef={anchorRef}
          from={from}
          to={to}
          open={customPickerOpen}
          onOpenChange={setCustomPickerOpen}
          onApply={(fromYmd, toYmd) => {
            applyPeriod({ period: "custom", from: fromYmd, to: toYmd });
            setCustomPickerOpen(false);
          }}
          onCancel={() => {
            setCustomPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
