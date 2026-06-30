import { PartnerStatus } from "@prisma/client";

/** Client-safe partner activation check (no server imports). */
export function isPartnerActive(
  partner: {
    status: PartnerStatus;
    filterStates: string[];
    walletBalance: number;
  },
  minLeadPrice = 25,
): boolean {
  if (partner.status !== PartnerStatus.active) return false;
  if (partner.filterStates.length < 15) return false;
  return partner.walletBalance >= minLeadPrice;
}
