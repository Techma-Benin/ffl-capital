"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { AdminDatePeriod } from "@/lib/leads/list-view-schema";
import { ADMIN_DASHBOARD_PERIOD_OPTIONS } from "@/lib/admin/admin-date-period";
import { useNavigateWithPending } from "@/hooks/use-navigate-with-pending";
import { AdminDateRangePopover } from "@/components/admin/admin-date-range-popover";

export function AdminDashboardPeriodFilter({
  datePeriod,
  from,
  to,
}: {
  datePeriod: AdminDatePeriod;
  from?: string;
  to?: string;
}) {
  const { push } = useNavigateWithPending();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [customPickerOpen, setCustomPickerOpen] = useState(false);

  function navigate(next: {
    period?: AdminDatePeriod;
    from?: string;
    to?: string;
    clearDates?: boolean;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    const period = next.period ?? datePeriod;

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
    <div className="relative flex flex-wrap items-center justify-end gap-2">
      <label className="sr-only" htmlFor="admin-dashboard-period">
        Period
      </label>
      <select
        id="admin-dashboard-period"
        className="form-select min-w-[160px] py-1.5 text-sm"
        value={datePeriod}
        onChange={(e) => {
          const value = e.target.value as AdminDatePeriod;
          if (value === "custom") {
            navigate({ period: "custom", clearDates: false });
            setCustomPickerOpen(true);
            return;
          }
          setCustomPickerOpen(false);
          navigate({ period: value, clearDates: true });
        }}
      >
        {ADMIN_DASHBOARD_PERIOD_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {datePeriod === "custom" && (
        <AdminDateRangePopover
          from={from}
          to={to}
          open={customPickerOpen}
          onOpenChange={setCustomPickerOpen}
          onApply={(fromYmd, toYmd) => {
            navigate({ period: "custom", from: fromYmd, to: toYmd });
            setCustomPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
