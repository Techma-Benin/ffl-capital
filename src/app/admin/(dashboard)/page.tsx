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
  searchParams: {
    period?: string;
    from?: string;
    to?: string;
  };
}) {
  if (!adminDashboardHasExplicitPeriod(searchParams)) {
    redirect(`/admin?period=${ADMIN_DASHBOARD_DEFAULT_PERIOD}`);
  }

  const initialPeriod = parseAdminDashboardPeriod(searchParams);

  const raw = await fetchAdminDashboardRawData();

  return <AdminDashboardView raw={raw} initialPeriod={initialPeriod} />;
}
