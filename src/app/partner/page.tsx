import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import { PartnerDashboard } from "@/components/partner/partner-dashboard";
import {
  loadEnabledCategoryLabels,
  resolveLeadTypeDisplay,
} from "@/lib/lead-categories/category-labels";

export default async function PartnerDashboardPage() {
  const partnerId = await getPartnerId();
  if (!partnerId) redirect("/onboarding");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const notRefunded = { partnerId, refundedAt: null };

  const [deliveriesAll, deliveriesToday, recentDeliveries, spentAggregate, categories] = await Promise.all([
    prisma.leadDelivery.count({ where: notRefunded }),
    prisma.leadDelivery.count({
      where: { ...notRefunded, deliveredAt: { gte: today } },
    }),
    prisma.leadDelivery.findMany({
      where: notRefunded,
      include: { lead: true },
      orderBy: { deliveredAt: "desc" },
      take: 5,
    }),
    prisma.leadDelivery.aggregate({
      where: notRefunded,
      _sum: { price: true },
    }),
    loadEnabledCategoryLabels(),
  ]);

  return (
    <PartnerDashboard
      stats={{
        deliveriesAll,
        deliveriesToday,
        spentThisMonth: Number(spentAggregate._sum.price ?? 0),
        recentDeliveries: recentDeliveries.map((d) => ({
          id: d.id,
          price: Number(d.price),
          channel: d.channel,
          deliveredAt: d.deliveredAt.toISOString(),
          lead: {
            id: d.lead.id,
            firstName: d.lead.firstName,
            lastName: d.lead.lastName,
            state: d.lead.state,
            leadType: d.lead.leadType ?? "",
            leadTypeLabel: resolveLeadTypeDisplay({
              leadType: d.lead.leadType,
              categoryResolution: d.lead.categoryResolution,
              categoryCandidateTypes: d.lead.categoryCandidateTypes,
              categories,
            }).label,
          },
        })),
      }}
    />
  );
}
