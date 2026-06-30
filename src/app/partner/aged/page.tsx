import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import { PartnerAgedView } from "@/components/partner/partner-aged";

export default async function PartnerAgedPage() {
  const partnerId = await getPartnerId();
  if (!partnerId) redirect("/onboarding");

  const targeting = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: { filterStates: true },
  });
  if (!targeting) redirect("/onboarding");

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [agedLeads, agedPriceResult] = await Promise.all([
    prisma.lead.findMany({
      where: {
        receivedAt: { lte: thirtyDaysAgo },
        status: { not: "dead" },
        state: {
          in: targeting.filterStates.length > 0 ? targeting.filterStates : ["__none__"],
        },
      },
      orderBy: { receivedAt: "asc" },
      take: 100,
    }),
    prisma.appSetting.findUnique({ where: { key: "default_aged_price" } }),
  ]);

  const agedPrice = agedPriceResult
    ? Number((agedPriceResult.value as { value: number }).value)
    : 5;

  return (
    <PartnerAgedView
      agedPrice={agedPrice}
      agedLeads={agedLeads.map((lead) => {
        const rawPayload = lead.rawPayload as Record<string, string> | null;
        return {
          id: lead.id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          state: lead.state,
          leadType: lead.leadType,
          receivedAt: lead.receivedAt.toISOString(),
          trustedformCertUrl: lead.trustedformCertUrl,
          intent: rawPayload?.intent ?? rawPayload?.Intent ?? "—",
          primaryGoal: rawPayload?.primary_goal ?? rawPayload?.PrimaryGoal ?? null,
        };
      })}
    />
  );
}
