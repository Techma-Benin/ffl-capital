import type { Partner, PartnerFilterSet } from "@prisma/client";
import {
  hasEligibleFilterSet,
  pickDefaultFilterSet,
} from "./default-filter-set";
import { MIN_FILTER_STATES } from "./constants";
import type { PartnerSession } from "./types";

export function serializePartner(
  partner: Partner,
  filterSets: PartnerFilterSet[] = [],
  clerkEmail?: string,
): PartnerSession {
  const defaultSet = pickDefaultFilterSet(filterSets);
  // Prefer default filter-set states when present — matching uses filter sets.
  const filterStates = defaultSet?.filterStates ?? partner.filterStates;

  const maxFilterSetStates = filterSets.reduce(
    (max, fs) => Math.max(max, fs.filterStates.length),
    0,
  );
  const hasStatesInAnyFilterSet = filterSets.some(
    (fs) => fs.filterStates.length >= MIN_FILTER_STATES,
  );

  return {
    id: partner.id,
    email: clerkEmail ?? partner.email,
    firstName: partner.firstName,
    lastName: partner.lastName,
    affiliation: partner.affiliation,
    residenceState: partner.residenceState,
    filterStates,
    hasEligibleFilterSet: hasEligibleFilterSet(filterSets),
    hasStatesInAnyFilterSet,
    maxFilterSetStates,
    walletBalance: Number(partner.walletBalance),
    status: partner.status,
    crmWebhookUrl: partner.crmWebhookUrl,
    createdAt: partner.createdAt.toISOString(),
    updatedAt: partner.updatedAt.toISOString(),
  };
}
