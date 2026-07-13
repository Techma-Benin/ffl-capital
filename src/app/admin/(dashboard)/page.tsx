import { prisma } from "@/lib/db";
import { PartnerStatus } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { getAdminDashboardChartData } from "@/lib/admin/dashboard-stats";
import { AdminDashboardCharts } from "@/components/admin/admin-dashboard-charts";

export default async function AdminDashboardPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalLeads,
    leadsToday,
    activePartners,
    pendingPartners,
    unmatchedLeads,
    recentLeads,
    chartData,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { receivedAt: { gte: today } } }),
    prisma.partner.count({ where: { status: PartnerStatus.active } }),
    prisma.partner.count({ where: { status: PartnerStatus.pending_approval } }),
    prisma.lead.count({ where: { status: "unmatched", available: true } }),
    prisma.lead.findMany({
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
    getAdminDashboardChartData(),
  ]);

  return (
    <div>
      <PageHeader
        title="Operations Dashboard"
        subtitle="Overview of platform activity"
      />

      <AdminDashboardCharts
        intakeByDay={chartData.intakeByDay}
        sparkByDay={chartData.sparkByDay}
        deliveringDonut={chartData.deliveringDonut}
        kpis={{
          totalLeads,
          leadsToday,
          activePartners,
          unmatchedLeads,
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
        pendingPartners={pendingPartners}
        unmatchedLeads={unmatchedLeads}
      />
    </div>
  );
}
