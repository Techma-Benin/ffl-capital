import { redirect } from "next/navigation";
import {
  ADMIN_DASHBOARD_DEFAULT_PERIOD,
  adminDashboardHasExplicitPeriod,
  adminDashboardNeedsServerRefetch,
  parseAdminDashboardPeriod,
  resolveAdminDashboardLookbackWindow,
  resolveAdminDashboardReceivedAtRange,
} from "@/lib/admin/admin-date-period";
import { fetchAdminDashboardRawData } from "@/lib/admin/dashboard-stats";
import { AdminDashboardView } from "@/components/admin/admin-dashboard-view";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  if (!adminDashboardHasExplicitPeriod(resolvedSearchParams)) {
    redirect(`/admin?period=${ADMIN_DASHBOARD_DEFAULT_PERIOD}`);
  }

  const initialPeriod = parseAdminDashboardPeriod(resolvedSearchParams);
  const range = resolveAdminDashboardReceivedAtRange({
    period: initialPeriod.datePeriod,
    from: initialPeriod.from,
    to: initialPeriod.to,
  });

  const lookback = resolveAdminDashboardLookbackWindow();
  const needsExtended = adminDashboardNeedsServerRefetch(
    initialPeriod.datePeriod,
    initialPeriod.from,
    lookback.gte.toISOString(),
  );

  const [lookbackRaw, initialExtended] = await Promise.all([
    fetchAdminDashboardRawData(),
    needsExtended
      ? fetchAdminDashboardRawData({
          range: { gte: range.gte, lte: range.lte },
        })
      : Promise.resolve(null),
  ]);

  return (
    <AdminDashboardView
      raw={lookbackRaw}
      initialExtended={initialExtended}
      initialPeriod={initialPeriod}
    />
  );
}
