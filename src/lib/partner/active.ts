import { PartnerStatus } from "@prisma/client";
import { MIN_FILTER_STATES } from "./constants";

/** Client-safe partner activation check (no server imports). */
export function isPartnerActive(
  partner: {
    status: PartnerStatus;
    filterStates: string[];
    walletBalance: number;
    /** When set, prefer filter-set eligibility (matching source of truth). */
    hasEligibleFilterSet?: boolean;
  },
  minLeadPrice = 25,
): boolean {
  if (partner.status !== PartnerStatus.active) return false;

  const statesOk =
    partner.hasEligibleFilterSet !== undefined
      ? partner.hasEligibleFilterSet
      : partner.filterStates.length >= MIN_FILTER_STATES;
  if (!statesOk) return false;

  return partner.walletBalance >= minLeadPrice;
}
