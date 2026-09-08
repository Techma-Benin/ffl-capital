/** Keys available for CRM outbound field mapping (matches buildLeadDeliveryPayload). */
export const LEAD_DELIVERY_SOURCE_FIELDS = [
  "deliveryId",
  "channel",
  "leadId",
  "externalId",
  "firstName",
  "lastName",
  "email",
  "phone",
  "address",
  "city",
  "state",
  "zip",
  "dob",
  "age",
  "leadType",
  "leadTypeLabel",
  "intent",
  "haveIul",
  "primaryGoal",
  "stateYouCurrentlyLiveIn",
  "trustedformCertUrl",
  "tcpaConsent",
  "tcpaLanguage",
  "leadidToken",
  "source",
  "landingPage",
  "subId",
  "pubId",
  "boberdooLeadType",
  "ipAddress",
  "userAgent",
  "price",
  "deliveredAt",
  "partnerId",
  "partnerEmail",
] as const;

export type LeadDeliverySourceField = (typeof LEAD_DELIVERY_SOURCE_FIELDS)[number];

export function isLeadDeliverySourceField(key: string): key is LeadDeliverySourceField {
  return (LEAD_DELIVERY_SOURCE_FIELDS as readonly string[]).includes(key);
}

/** Parse top-level keys from sample JSON (wizard import). */
export function parseTopLevelJsonKeys(sample: string): string[] {
  const parsed = JSON.parse(sample) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Sample JSON must be a flat object");
  }
  return Object.keys(parsed as Record<string, unknown>);
}
