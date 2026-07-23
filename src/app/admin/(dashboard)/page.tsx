import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { PartnerStatus } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { getAdminDashboardChartData } from "@/lib/admin/dashboard-stats";
import { AdminDashboardCharts } from "@/components/admin/admin-dashboard-charts";
import { AdminDashboardPeriodFilter } from "@/components/admin/admin-dashboard-period-filter";
import {
  adminDashboardPeriodDisplayLabel,
  parseAdminDashboardPeriod,
  resolveAdminDashboardReceivedAtRange,
} from "@/lib/admin/admin-date-period";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: {
    period?: string;
    from?: string;
    to?: string;
  };
}) {
  const periodFilters = parseAdminDashboardPeriod(searchParams);
  const receivedRange = resolveAdminDashboardReceivedAtRange(searchParams);
  const periodLabel = adminDashboardPeriodDisplayLabel(
    periodFilters.datePeriod,
    periodFilters.from,
    periodFilters.to,
  );

  const receivedAtWhere = {
    receivedAt: { gte: receivedRange.gte, lte: receivedRange.lte },
  };
  const deliveredAtWhere = {
    deliveredAt: { gte: receivedRange.gte, lte: receivedRange.lte },
  };

  const [
    leadsInPeriod,
    deliveriesInPeriod,
    activePartners,
    unmatchedLeads,
    recentLeads,
    chartData,
  ] = await Promise.all([
    prisma.lead.count({ where: receivedAtWhere }),
    prisma.leadDelivery.count({ where: deliveredAtWhere }),
    prisma.partner.count({ where: { status: PartnerStatus.active } }),
    prisma.lead.count({ where: { status: "unmatched", available: true } }),
    prisma.lead.findMany({
      where: receivedAtWhere,
      orderBy: { receivedAt: "desc" },
      take: 8,
      include: {
        leadDeliveries: {
          include: { partner: true },
          orderBy: { deliveredAt: "desc" },
          take: 1,
        },
      },
    }),
    getAdminDashboardChartData(receivedRange),
  ]);

  const intakeTitle =
    periodFilters.datePeriod === "last_7_days"
      ? "Lead Intake (7 days)"
      : `Lead Intake (${periodLabel})`;

  return (
    <div>
      <PageHeader
        title="Operations Dashboard"
        subtitle="Overview of platform activity"
        action={
          <Suspense fallback={null}>
            <AdminDashboardPeriodFilter
              datePeriod={periodFilters.datePeriod}
              from={periodFilters.from}
              to={periodFilters.to}
            />
          </Suspense>
        }
      />

      <AdminDashboardCharts
        intakeByDay={chartData.intakeByDay}
        sparkByDay={chartData.sparkByDay}
        deliveringDonut={chartData.deliveringDonut}
        intakeChartTitle={intakeTitle}
        kpis={{
          leadsInPeriod,
          deliveriesInPeriod,
          activePartners,
          unmatchedLeads,
          leadsLabel: `Leads (${periodLabel})`,
          deliveriesLabel: `Deliveries (${periodLabel})`,
        }}
        recentLeads={recentLeads.map((lead) => {
          const delivery = lead.leadDeliveries[0];
          return {
            id: lead.id,
            firstName: lead.firstName,
            lastName: lead.lastName,
            state: lead.state,
            leadType: lead.leadType,
            status: lead.status,
            receivedAt: lead.receivedAt.toISOString(),
            partnerName: delivery
              ? `${delivery.partner.firstName} ${delivery.partner.lastName}`
              : null,
          };
        })}
      />
    </div>
  );
}
