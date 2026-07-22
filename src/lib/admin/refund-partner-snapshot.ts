/** Partner fields loaded on the server for refund table side sheets. */
export type RefundPartnerSnapshot = {
  id: string;
  name: string;
  email: string;
  status: string;
  filterStates: string[];
  walletBalance: number;
  priceOverride: number | null;
  leadType: string;
  priority: number;
  deliveryCount: number;
};

export const refundPartnerStatusBadge: Record<
  string,
  "green" | "yellow" | "red" | "slate"
> = {
  active: "green",
  pending_approval: "yellow",
  rejected: "red",
  disabled: "slate",
};

export const refundPartnerStatusLabel: Record<string, string> = {
  active: "Active",
  pending_approval: "Pending approval",
  rejected: "Rejected",
  disabled: "Disabled",
};

type PartnerRowSource = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  filterStates: string[];
  walletBalance: { toString(): string } | number;
  priceOverride: { toString(): string } | number | null;
  leadType: string;
  priority: number;
  _count: { leadDeliveries: number };
};

export function refundPartnerSnapshotFromRow(
  partner: PartnerRowSource,
): RefundPartnerSnapshot {
  return {
    id: partner.id,
    name: `${partner.firstName} ${partner.lastName}`,
    email: partner.email,
    status: partner.status,
    filterStates: partner.filterStates,
    walletBalance: Number(partner.walletBalance),
    priceOverride:
      partner.priceOverride != null ? Number(partner.priceOverride) : null,
    leadType: partner.leadType,
    priority: partner.priority,
    deliveryCount: partner._count.leadDeliveries,
  };
}
