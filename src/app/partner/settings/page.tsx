import { PartnerSettingsView } from "@/components/partner/partner-settings";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import type { PartnerCrmSummary } from "@/lib/partner/types";

export default async function PartnerSettingsPage() {
  const partnerId = await getPartnerId();

  let initialCrm: PartnerCrmSummary = null;
  let initialBalance: number | undefined;
  let initialSubscription: { active: boolean; amount: number } | null = null;

  if (partnerId) {
    const [config, partner, subscription] = await Promise.all([
      prisma.partnerCrmOutboundConfig.findUnique({
        where: { partnerId },
        select: { enabled: true, endpointUrl: true, authType: true },
      }),
      prisma.partner.findUnique({
        where: { id: partnerId },
        select: { walletBalance: true },
      }),
      prisma.billingRecurrence.findFirst({
        where: { partnerId, active: true },
        orderBy: { createdAt: "desc" },
        select: { active: true, amount: true },
      }),
    ]);

    if (config) {
      initialCrm = {
        enabled: config.enabled,
        endpointUrl: config.endpointUrl,
        authType: config.authType,
      };
    }
    if (partner) {
      initialBalance = Number(partner.walletBalance);
    }
    initialSubscription = subscription
      ? { active: subscription.active, amount: Number(subscription.amount) }
      : null;
  }

  return (
    <PartnerSettingsView
      initialCrm={initialCrm}
      initialBalance={initialBalance}
      initialSubscription={initialSubscription}
    />
  );
}
