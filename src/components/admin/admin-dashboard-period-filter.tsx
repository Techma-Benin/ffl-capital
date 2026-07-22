"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { AdminDatePeriod } from "@/lib/leads/list-view-schema";
import { ADMIN_DASHBOARD_PERIOD_OPTIONS } from "@/lib/admin/admin-date-period";
import { useNavigateWithPending } from "@/hooks/use-navigate-with-pending";

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
    <div className="flex flex-wrap items-center justify-end gap-2">
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
            return;
          }
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
        <>
          <input
            type="date"
            aria-label="From date"
            className="form-input py-1.5 text-sm"
            value={from ?? ""}
            onChange={(e) => navigate({ from: e.target.value || undefined })}
          />
          <span className="text-xs text-slate-400">–</span>
          <input
            type="date"
            aria-label="To date"
            className="form-input py-1.5 text-sm"
            value={to ?? ""}
            onChange={(e) => navigate({ to: e.target.value || undefined })}
          />
        </>
      )}
    </div>
  );
}
