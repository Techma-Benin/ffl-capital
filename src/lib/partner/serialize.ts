import type { Partner } from "@prisma/client";
import type { PartnerSession } from "./types";

export function serializePartner(partner: Partner): PartnerSession {
  return {
    id: partner.id,
    email: partner.email,
    firstName: partner.firstName,
    lastName: partner.lastName,
    affiliation: partner.affiliation,
    residenceState: partner.residenceState,
    leadType: partner.leadType,
    filterStates: partner.filterStates,
    walletBalance: Number(partner.walletBalance),
    status: partner.status,
    crmWebhookUrl: partner.crmWebhookUrl,
    createdAt: partner.createdAt.toISOString(),
    updatedAt: partner.updatedAt.toISOString(),
  };
}
