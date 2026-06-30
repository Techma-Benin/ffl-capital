import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import { PartnerDashboard } from "@/components/partner/partner-dashboard";

export default async function PartnerDashboardPage() {
  const partnerId = await getPartnerId();
  if (!partnerId) redirect("/onboarding");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [deliveriesAll, deliveriesToday, recentDeliveries] = await Promise.all([
    prisma.leadDelivery.count({ where: { partnerId } }),
    prisma.leadDelivery.count({
      where: { partnerId, deliveredAt: { gte: today } },
    }),
    prisma.leadDelivery.findMany({
      where: { partnerId },
      include: { lead: true },
      orderBy: { deliveredAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <PartnerDashboard
      stats={{
        deliveriesAll,
        deliveriesToday,
        recentDeliveries: recentDeliveries.map((d) => ({
          id: d.id,
          price: Number(d.price),
          channel: d.channel,
          deliveredAt: d.deliveredAt.toISOString(),
          lead: {
            firstName: d.lead.firstName,
            lastName: d.lead.lastName,
            state: d.lead.state,
            leadType: d.lead.leadType,
          },
        })),
      }}
    />
  );
}
