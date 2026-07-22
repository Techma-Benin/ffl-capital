/** Partner fields loaded on the server for refund table side sheets. */
export type RefundPartnerSnapshot = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: string;
  affiliation: string | null;
  memberSince: string;
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
  affiliation: string | null;
  createdAt: Date;
  filterStates: string[];
  walletBalance: { toString(): string } | number;
  priceOverride: { toString(): string } | number | null;
  leadType: string;
  priority: number;
  _count: { leadDeliveries: number };
};

export function refundPartnerSnapshotFromRow(
  partner: PartnerRowSource,
  options?: { avatarUrl?: string | null },
): RefundPartnerSnapshot {
  const avatarUrl = options?.avatarUrl ?? null;
  return {
    id: partner.id,
    firstName: partner.firstName,
    lastName: partner.lastName,
    name: `${partner.firstName} ${partner.lastName}`,
    email: partner.email,
    avatarUrl,
    status: partner.status,
    affiliation: partner.affiliation,
    memberSince: partner.createdAt.toISOString(),
    filterStates: partner.filterStates,
    walletBalance: Number(partner.walletBalance),
    priceOverride:
      partner.priceOverride != null ? Number(partner.priceOverride) : null,
    leadType: partner.leadType,
    priority: partner.priority,
    deliveryCount: partner._count.leadDeliveries,
  };
}
