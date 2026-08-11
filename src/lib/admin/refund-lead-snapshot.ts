import type { LeadPreviewAnswer, LeadPreviewModel } from "@/lib/leads/lead-preview";
import { LEAD_PREVIEW_COLUMN_PAYLOAD_KEYS } from "@/lib/leads/lead-preview";
import { extractOtherPayloadFields } from "@/lib/leads/other-payload-fields";

/** Lead + delivery fields loaded on the server for refund table side sheets. */
export type RefundLeadSnapshot = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  age: string | null;
  leadType: string | null;
  leadTypeLabel: string;
  status: string;
  receivedAt: string;
  haveIul: string | null;
  primaryGoal: string | null;
  beneficiary: string | null;
  beneficiaryType: string | null;
  historyOfCancer: string | null;
  mortgageLoanAmount: string | null;
  otherAnswers: LeadPreviewAnswer[];
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
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  age: string | null;
  leadType: string | null;
  status: string;
  receivedAt: Date;
  haveIul: string | null;
  primaryGoal: string | null;
  beneficiary: string | null;
  beneficiaryType: string | null;
  historyOfCancer: string | null;
  mortgageLoanAmount: string | null;
  rawPayload?: unknown;
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

function contactFieldsFromLead(
  lead: LeadRowSource,
  leadTypeLabel: string,
): Pick<
  RefundLeadSnapshot,
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "address"
  | "city"
  | "zip"
  | "age"
  | "leadTypeLabel"
  | "haveIul"
  | "primaryGoal"
  | "beneficiary"
  | "beneficiaryType"
  | "historyOfCancer"
  | "mortgageLoanAmount"
  | "otherAnswers"
> {
  return {
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    address: lead.address,
    city: lead.city,
    zip: lead.zip,
    age: lead.age,
    leadTypeLabel,
    haveIul: lead.haveIul,
    primaryGoal: lead.primaryGoal,
    beneficiary: lead.beneficiary,
    beneficiaryType: lead.beneficiaryType,
    historyOfCancer: lead.historyOfCancer,
    mortgageLoanAmount: lead.mortgageLoanAmount,
    otherAnswers: extractOtherPayloadFields(lead.rawPayload, {
      omitKeys: LEAD_PREVIEW_COLUMN_PAYLOAD_KEYS,
    }).map(({ label, value }) => ({ label, value })),
  };
}

export function refundLeadSnapshotFromDelivery(
  delivery: DeliveryRowSource,
  partner: PartnerNameSource,
  options?: { leadTypeLabel?: string },
): RefundLeadSnapshot {
  const leadTypeLabel =
    options?.leadTypeLabel ?? delivery.lead.leadType ?? "Unclassified";
  return {
    id: delivery.lead.id,
    name: `${delivery.lead.firstName} ${delivery.lead.lastName}`,
    state: delivery.lead.state,
    leadType: delivery.lead.leadType,
    status: delivery.lead.status,
    receivedAt: delivery.lead.receivedAt.toISOString(),
    ...contactFieldsFromLead(delivery.lead, leadTypeLabel),
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
    leadTypeLabel: string;
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
      { leadTypeLabel: options.leadTypeLabel },
    );
  }

  return {
    id: lead.id,
    name: `${lead.firstName} ${lead.lastName}`,
    state: lead.state,
    leadType: lead.leadType,
    status: lead.status,
    receivedAt: lead.receivedAt.toISOString(),
    ...contactFieldsFromLead(lead, options.leadTypeLabel),
    partner: { id: "", name: "—" },
    delivery: {
      deliveredAt: "",
      price: options.agedPrice,
      channel: "aged",
    },
  };
}

/** Map refund/admin snapshot → shared lead preview sheet model. */
export function leadPreviewFromRefundSnapshot(
  lead: RefundLeadSnapshot,
): LeadPreviewModel {
  return {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    address: lead.address,
    city: lead.city,
    state: lead.state,
    zip: lead.zip,
    age: lead.age,
    leadType: lead.leadType ?? "",
    leadTypeLabel: lead.leadTypeLabel,
    receivedAt: lead.receivedAt,
    haveIul: lead.haveIul,
    primaryGoal: lead.primaryGoal,
    beneficiary: lead.beneficiary,
    beneficiaryType: lead.beneficiaryType,
    historyOfCancer: lead.historyOfCancer,
    mortgageLoanAmount: lead.mortgageLoanAmount,
    otherAnswers: lead.otherAnswers,
    price: lead.delivery.price,
    status: lead.status,
  };
}
