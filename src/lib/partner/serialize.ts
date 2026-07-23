import type { Partner, PartnerFilterSet } from "@prisma/client";
import type { FilterCriteria } from "@/lib/matching/types";
import {
  hasEligibleFilterSet,
  pickDefaultFilterSet,
} from "./default-filter-set";
import { MIN_FILTER_STATES } from "./constants";
import type { PartnerFilterSetSession, PartnerSession } from "./types";

function serializeFilterSet(fs: PartnerFilterSet): PartnerFilterSetSession {
  return {
    id: fs.id,
    name: fs.name,
    leadType: fs.leadType,
    filterStates: fs.filterStates,
    priority: fs.priority,
    active: fs.active,
    weeklyLimit: fs.weeklyLimit,
    monthlyLimit: fs.monthlyLimit,
    filterCriteria: (fs.filterCriteria ?? {}) as FilterCriteria,
  };
}

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
    filterSets: filterSets.map(serializeFilterSet),
    walletBalance: Number(partner.walletBalance),
    status: partner.status,
    createdAt: partner.createdAt.toISOString(),
    updatedAt: partner.updatedAt.toISOString(),
  };
}
