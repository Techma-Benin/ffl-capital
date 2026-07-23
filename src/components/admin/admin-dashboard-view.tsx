"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { AdminDatePeriod } from "@/lib/leads/list-view-schema";
import {
  adminDashboardPeriodDisplayLabel,
  resolveAdminDashboardReceivedAtRange,
} from "@/lib/admin/admin-date-period";
import {
  computeAdminDashboardView,
  type AdminDashboardRawData,
} from "@/lib/admin/dashboard-stats";
import { PageHeader } from "@/components/ui/page-header";
import { AdminDashboardCharts } from "@/components/admin/admin-dashboard-charts";
import { AdminDashboardPeriodFilter } from "@/components/admin/admin-dashboard-period-filter";
import { ClientStoreKeys, useClientResource } from "@/lib/client-store";

type PeriodState = {
  datePeriod: AdminDatePeriod;
  from?: string;
  to?: string;
};

function syncDashboardUrl(pathname: string, state: PeriodState) {
  const params = new URLSearchParams();
  params.set("period", state.datePeriod);
  if (state.datePeriod === "custom") {
    if (state.from) params.set("from", state.from);
    if (state.to) params.set("to", state.to);
  }
  const qs = params.toString();
  const href = qs ? `${pathname}?${qs}` : pathname;
  window.history.replaceState(window.history.state, "", href);
}

export function AdminDashboardView({
  raw: initialRaw,
  initialPeriod,
}: {
  raw: AdminDashboardRawData;
  initialPeriod: PeriodState;
}) {
  const pathname = usePathname();
  const { data: raw } = useClientResource<AdminDashboardRawData>(
    ClientStoreKeys.adminDashboard,
    { initialData: initialRaw },
  );
  const [period, setPeriod] = useState<PeriodState>(initialPeriod);

  const onPeriodChange = useCallback(
    (next: {
      period: AdminDatePeriod;
      from?: string;
      to?: string;
      clearDates?: boolean;
    }) => {
      setPeriod((prev) => {
        const datePeriod = next.period;
        let from = next.from;
        let to = next.to;
        if (next.clearDates || datePeriod !== "custom") {
          from = undefined;
          to = undefined;
        } else {
          if (from === undefined) from = prev.from;
          if (to === undefined) to = prev.to;
        }
        const nextState: PeriodState = { datePeriod, from, to };
        syncDashboardUrl(pathname, nextState);
        return nextState;
      });
    },
    [pathname],
  );

  const searchShape = useMemo(
    () => ({
      period: period.datePeriod,
      from: period.from,
      to: period.to,
    }),
    [period],
  );

  const receivedRange = useMemo(
    () => resolveAdminDashboardReceivedAtRange(searchShape),
    [searchShape],
  );

  const periodLabel =
    period.datePeriod === "custom" && (period.from || period.to)
      ? adminDashboardPeriodDisplayLabel(
          period.datePeriod,
          period.from,
          period.to,
        )
      : undefined;

  const view = useMemo(
    () => computeAdminDashboardView(raw ?? initialRaw, receivedRange),
    [raw, initialRaw, receivedRange],
  );

  return (
    <div>
      <PageHeader
        title="Operations Dashboard"
        subtitle="Overview of platform activity"
        action={
          <AdminDashboardPeriodFilter
            datePeriod={period.datePeriod}
            from={period.from}
            to={period.to}
            periodDisplayLabel={periodLabel}
            onPeriodChange={onPeriodChange}
          />
        }
      />

      <AdminDashboardCharts
        intakeByDay={view.chartData.intakeByDay}
        sparkByDay={view.chartData.sparkByDay}
        deliveringDonut={view.chartData.deliveringDonut}
        kpis={view.kpis}
        recentLeads={view.recentLeads}
      />
    </div>
  );
}