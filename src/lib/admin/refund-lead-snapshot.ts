/** Lead + delivery fields loaded on the server for refund table side sheets. */
export type RefundLeadSnapshot = {
  id: string;
  name: string;
  state: string;
  leadType: string;
  status: string;
  receivedAt: string;
  partner: {
    id: string;
    name: string;
  };
  delivery: {
    deliveredAt: string;
    price: number;
    channel: string;
  };
};

export const refundLeadStatusBadge: Record<
  string,
  "green" | "yellow" | "red" | "blue" | "slate"
> = {
  delivered: "green",
  unmatched: "yellow",
  integrity_posted: "blue",
  aged_listed: "slate",
  dead: "red",
  review: "yellow",
};

export const refundLeadStatusLabel: Record<string, string> = {
  delivered: "Delivered",
  unmatched: "Unmatched",
  integrity_posted: "Integrity",
  aged_listed: "Aged",
  dead: "Dead",
  review: "Review",
};

export function formatRefundLeadChannel(channel: string): string {
  if (channel === "realtime") return "Realtime";
  if (channel === "aged") return "Aged";
  return channel;
}

type LeadRowSource = {
  id: string;
  firstName: string;
  lastName: string;
  state: string;
  leadType: string;
  status: string;
  receivedAt: Date;
};

type PartnerNameSource = {
  id: string;
  firstName: string;
  lastName: string;
};

type DeliveryRowSource = {
  deliveredAt: Date;
  price: { toString(): string } | number;
  channel: string;
  lead: LeadRowSource;
};

export function refundLeadSnapshotFromDelivery(
  delivery: DeliveryRowSource,
  partner: PartnerNameSource,
): RefundLeadSnapshot {
  return {
    id: delivery.lead.id,
    name: `${delivery.lead.firstName} ${delivery.lead.lastName}`,
    state: delivery.lead.state,
    leadType: delivery.lead.leadType,
    status: delivery.lead.status,
    receivedAt: delivery.lead.receivedAt.toISOString(),
    partner: {
      id: partner.id,
      name: `${partner.firstName} ${partner.lastName}`,
    },
    delivery: {
      deliveredAt: delivery.deliveredAt.toISOString(),
      price: Number(delivery.price),
      channel: delivery.channel,
    },
  };
}
