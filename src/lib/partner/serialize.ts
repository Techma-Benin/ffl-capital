import type { Partner, PartnerFilterSet } from "@prisma/client";
import {
  hasEligibleFilterSet,
  pickDefaultFilterSet,
} from "./default-filter-set";
import type { PartnerSession } from "./types";

export function serializePartner(
  partner: Partner,
  filterSets: PartnerFilterSet[] = [],
): PartnerSession {
  const defaultSet = pickDefaultFilterSet(filterSets);
  // Prefer default filter-set states when present — matching uses filter sets.
  const filterStates = defaultSet?.filterStates ?? partner.filterStates;

  return {
    id: partner.id,
    email: partner.email,
    firstName: partner.firstName,
    lastName: partner.lastName,
    affiliation: partner.affiliation,
    residenceState: partner.residenceState,
    leadType: partner.leadType,
    filterStates,
    hasEligibleFilterSet: hasEligibleFilterSet(filterSets),
    walletBalance: Number(partner.walletBalance),
    status: partner.status,
    crmWebhookUrl: partner.crmWebhookUrl,
    createdAt: partner.createdAt.toISOString(),
    updatedAt: partner.updatedAt.toISOString(),
  };
}
