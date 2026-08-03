"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { AdminDatePeriod } from "@/lib/leads/list-view-schema";
import {
  adminDashboardNeedsServerRefetch,
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

async function fetchDashboardRaw(period: PeriodState): Promise<AdminDashboardRawData> {
  const params = new URLSearchParams();
  params.set("period", period.datePeriod);
  if (period.datePeriod === "custom") {
    if (period.from) params.set("from", period.from);
    if (period.to) params.set("to", period.to);
  }
  const res = await fetch(`/api/admin/dashboard?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to load dashboard data");
  }
  return res.json() as Promise<AdminDashboardRawData>;
}

export function AdminDashboardView({
  raw: initialRaw,
  initialExtended = null,
  initialPeriod,
}: {
  /** Always the 90-day lookback payload for short preset client filtering. */
  raw: AdminDashboardRawData;
  /** SSR-fetched payload when the landing URL needs All time / long custom. */
  initialExtended?: AdminDashboardRawData | null;
  initialPeriod: PeriodState;
}) {
  const pathname = usePathname();
  const { data: raw } = useClientResource<AdminDashboardRawData>(
    ClientStoreKeys.adminDashboard,
    { initialData: initialRaw },
  );
  const [period, setPeriod] = useState<PeriodState>(initialPeriod);
  const [extendedRaw, setExtendedRaw] = useState<AdminDashboardRawData | null>(
    initialExtended,
  );
  const [extendedLoading, setExtendedLoading] = useState(false);
  const [extendedError, setExtendedError] = useState<string | null>(null);

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

  const baseRaw = raw ?? initialRaw;

  const needsExtended = useMemo(
    () =>
      adminDashboardNeedsServerRefetch(
        period.datePeriod,
        period.from,
        baseRaw.windowStart,
      ),
    [period.datePeriod, period.from, baseRaw.windowStart],
  );

  useEffect(() => {
    if (!needsExtended) {
      setExtendedRaw(null);
      setExtendedError(null);
      setExtendedLoading(false);
      return;
    }

    // Reuse SSR extended payload when it still matches the current period.
    if (
      initialExtended &&
      period.datePeriod === initialPeriod.datePeriod &&
      period.from === initialPeriod.from &&
      period.to === initialPeriod.to
    ) {
      setExtendedRaw(initialExtended);
      setExtendedLoading(false);
      setExtendedError(null);
      return;
    }

    let cancelled = false;
    setExtendedLoading(true);
    setExtendedError(null);
    setExtendedRaw(null);

    void fetchDashboardRaw(period)
      .then((data) => {
        if (cancelled) return;
        setExtendedRaw(data);
      })
      .catch(() => {
        if (cancelled) return;
        setExtendedError("Could not load this period. Try again.");
        setExtendedRaw(null);
      })
      .finally(() => {
        if (!cancelled) setExtendedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    needsExtended,
    period,
    initialExtended,
    initialPeriod.datePeriod,
    initialPeriod.from,
    initialPeriod.to,
  ]);

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

  const activeRaw = needsExtended ? extendedRaw : baseRaw;

  const view = useMemo(() => {
    if (!activeRaw) return null;
    return computeAdminDashboardView(activeRaw, receivedRange);
  }, [activeRaw, receivedRange]);

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

      {needsExtended && extendedLoading && !view ? (
        <p className="mt-8 text-sm text-slate-500">Loading period data…</p>
      ) : null}

      {extendedError ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {extendedError}
        </p>
      ) : null}

      {view ? (
        <AdminDashboardCharts
          intakeByDay={view.chartData.intakeByDay}
          sparkByDay={view.chartData.sparkByDay}
          intakeVolumeLabel={view.chartData.volumeLabel}
          deliveringDonut={view.chartData.deliveringDonut}
          deliveryRatePercent={view.chartData.deliveryRatePercent}
          kpis={view.kpis}
          recentLeads={view.recentLeads}
        />
      ) : null}
    </div>
  );
}
