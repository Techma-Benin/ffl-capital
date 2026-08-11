/** Lead + delivery fields loaded on the server for refund table side sheets. */
export type RefundLeadSnapshot = {
  id: string;
  name: string;
  state: string;
  leadType: string | null;
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
  dead: "red",
  review: "yellow",
};

export const refundLeadStatusLabel: Record<string, string> = {
  delivered: "Delivered",
  unmatched: "Unmatched",
  integrity_posted: "Integrity",
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
  leadType: string | null;
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

type AgedListingDeliverySource = {
  deliveredAt: Date;
  price: { toString(): string } | number;
  channel: string;
  partner: PartnerNameSource;
};

/** Snapshot for admin aged marketplace rows (latest delivery when present). */
export function refundLeadSnapshotFromAgedListing(
  lead: LeadRowSource,
  options: {
    agedPrice: number;
    latestDelivery?: AgedListingDeliverySource | null;
  },
): RefundLeadSnapshot {
  const latest = options.latestDelivery;
  if (latest) {
    return refundLeadSnapshotFromDelivery(
      {
        deliveredAt: latest.deliveredAt,
        price: latest.price,
        channel: latest.channel,
        lead,
      },
      latest.partner,
    );
  }

  return {
    id: lead.id,
    name: `${lead.firstName} ${lead.lastName}`,
    state: lead.state,
    leadType: lead.leadType,
    status: lead.status,
    receivedAt: lead.receivedAt.toISOString(),
    partner: { id: "", name: "—" },
    delivery: {
      deliveredAt: "",
      price: options.agedPrice,
      channel: "aged",
    },
  };
}
