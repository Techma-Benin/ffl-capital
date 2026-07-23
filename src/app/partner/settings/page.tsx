import { PartnerSettingsView } from "@/components/partner/partner-settings";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import type { PartnerCrmSummary } from "@/lib/partner/types";

export default async function PartnerSettingsPage() {
  const partnerId = await getPartnerId();

  let initialCrm: PartnerCrmSummary = null;
  if (partnerId) {
    const config = await prisma.partnerCrmOutboundConfig.findUnique({
      where: { partnerId },
      select: {
        enabled: true,
        endpointUrl: true,
        authType: true,
      },
    });
    if (config) {
      initialCrm = {
        enabled: config.enabled,
        endpointUrl: config.endpointUrl,
        authType: config.authType,
      };
    }
  }

  return <PartnerSettingsView initialCrm={initialCrm} />;
}
