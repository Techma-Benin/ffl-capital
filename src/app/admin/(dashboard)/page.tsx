import { redirect } from "next/navigation";
import {
  ADMIN_DASHBOARD_DEFAULT_PERIOD,
  adminDashboardHasExplicitPeriod,
  parseAdminDashboardPeriod,
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

  const raw = await fetchAdminDashboardRawData();

  return <AdminDashboardView raw={raw} initialPeriod={initialPeriod} />;
}
