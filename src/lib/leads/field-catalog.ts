export type LeadFieldType = "text" | "date" | "boolean" | "number";

export type LeadFieldDefinition = {
  key: string;
  label: string;
  type: LeadFieldType;
  aliases: readonly string[];
  required?: boolean;
  protected?: boolean;
};

/**
 * The import/export contract. Keep database/system fields protected: they are
 * derived by the application and must not be accepted from a CSV mapping.
 */
export const LEAD_FIELD_CATALOG: readonly LeadFieldDefinition[] = [
  { key: "id", label: "ID", type: "text", aliases: ["id"], protected: true },
  { key: "externalId", label: "External ID", type: "text", aliases: ["external_id", "unique_identifier"] },
  { key: "firstName", label: "First Name", type: "text", aliases: ["first_name", "firstname"], required: true },
  { key: "lastName", label: "Last Name", type: "text", aliases: ["last_name", "lastname"] },
  { key: "email", label: "Email", type: "text", aliases: ["email"], required: true },
  { key: "phone", label: "Phone", type: "text", aliases: ["phone", "primary_phone"] },
  { key: "address", label: "Address", type: "text", aliases: ["address"] },
  { key: "city", label: "City", type: "text", aliases: ["city"] },
  { key: "state", label: "State", type: "text", aliases: ["state"], required: true },
  { key: "zip", label: "ZIP", type: "text", aliases: ["zip"] },
  { key: "dob", label: "Date of Birth", type: "date", aliases: ["dob", "date_of_birth"] },
  { key: "age", label: "Age", type: "number", aliases: ["age"] },
  { key: "leadType", label: "Lead Type", type: "text", aliases: ["lead_type", "classification"] },
  { key: "intent", label: "Intent", type: "text", aliases: ["intent"] },
  { key: "haveIul", label: "Have IUL", type: "text", aliases: ["have_iul", "haveiul", "has_iul_thom"] },
  { key: "primaryGoal", label: "Primary Goal", type: "text", aliases: ["primary_goal", "primarygoal", "primary_goal_thom"] },
  { key: "stateYouCurrentlyLiveIn", label: "State You Currently Live In", type: "text", aliases: ["state_you_currently_live_in"] },
  { key: "beneficiary", label: "Beneficiary", type: "text", aliases: ["beneficiary", "beneficiary_thom"] },
  { key: "beneficiaryType", label: "Beneficiary Type", type: "text", aliases: ["beneficiary_type", "beneficiary_type_thom", "relationship_of_beneficiary"] },
  { key: "historyOfCancer", label: "History Of Cancer", type: "text", aliases: ["history_of_cancer", "history_of_cancer_thom"] },
  { key: "mortgageLoanAmount", label: "Mortgage Loan Amount", type: "text", aliases: ["mortgage_loan_amount", "mortgage_loan_amount_thom", "mortgage.loan.amount"] },
  { key: "trustedformCertUrl", label: "TrustedForm Cert URL", type: "text", aliases: ["trustedform_cert_url", "trusted_form_url"] },
  { key: "trustedformValid", label: "TrustedForm Valid", type: "boolean", aliases: ["trustedform_valid"], protected: true },
  { key: "trustedformCheckedAt", label: "TrustedForm Checked At", type: "date", aliases: ["trustedform_checked_at"], protected: true },
  { key: "tcpaConsent", label: "TCPA Consent", type: "text", aliases: ["tcpa_consent"] },
  { key: "tcpaLanguage", label: "TCPA Language", type: "text", aliases: ["tcpa_language"] },
  { key: "leadidToken", label: "LeadID Token", type: "text", aliases: ["leadid_token", "leadi_d_token"] },
  { key: "source", label: "Source", type: "text", aliases: ["source", "src"] },
  { key: "landingPage", label: "Landing Page", type: "text", aliases: ["landing_page"] },
  { key: "subId", label: "Sub ID", type: "text", aliases: ["sub_id"] },
  { key: "pubId", label: "Pub ID", type: "text", aliases: ["pub_id"] },
  { key: "boberdooLeadType", label: "Boberdoo Lead Type", type: "text", aliases: ["boberdoo_lead_type", "lead_type_id"] },
  { key: "ipAddress", label: "IP Address", type: "text", aliases: ["ip_address"] },
  { key: "userAgent", label: "User Agent", type: "text", aliases: ["user_agent"] },
  { key: "receivedAt", label: "Received At", type: "date", aliases: ["received_at"] },
  { key: "status", label: "Status", type: "text", aliases: ["status"], protected: true },
  { key: "available", label: "Available", type: "boolean", aliases: ["available"], protected: true },
  { key: "refundable", label: "Refundable", type: "boolean", aliases: ["refundable"], protected: true },
  { key: "agedSaleCount", label: "Aged Sale Count", type: "number", aliases: ["aged_sale_count"], protected: true },
  { key: "agedAvailableAfter", label: "Aged Available After", type: "date", aliases: ["aged_available_after"], protected: true },
  { key: "liveSoldAt", label: "Live Sold At", type: "date", aliases: ["live_sold_at"], protected: true },
  { key: "liveSaleChannel", label: "Live Sale Channel", type: "text", aliases: ["live_sale_channel"], protected: true },
  { key: "lastRoutingAttemptAt", label: "Last Routing Attempt At", type: "date", aliases: ["last_routing_attempt_at"], protected: true },
  { key: "nextRoutingAttemptAt", label: "Next Routing Attempt At", type: "date", aliases: ["next_routing_attempt_at"], protected: true },
  { key: "routingAttemptCount", label: "Routing Attempt Count", type: "number", aliases: ["routing_attempt_count"], protected: true },
  { key: "integrityBlockedAt", label: "Integrity Blocked At", type: "date", aliases: ["integrity_blocked_at"], protected: true },
  { key: "integrityBlockedReason", label: "Integrity Blocked Reason", type: "text", aliases: ["integrity_blocked_reason"], protected: true },
  { key: "routingClaimedAt", label: "Routing Claimed At", type: "date", aliases: ["routing_claimed_at"], protected: true },
  { key: "routingClaimedBy", label: "Routing Claimed By", type: "text", aliases: ["routing_claimed_by"], protected: true },
  { key: "routingClaimExpiresAt", label: "Routing Claim Expires At", type: "date", aliases: ["routing_claim_expires_at"], protected: true },
  { key: "createdAt", label: "Created At", type: "date", aliases: ["created_at"], protected: true },
  { key: "updatedAt", label: "Updated At", type: "date", aliases: ["updated_at"], protected: true },
  { key: "categoryResolution", label: "Category Resolution", type: "text", aliases: ["category_resolution"], protected: true },
  { key: "categoryCandidateTypes", label: "Category Candidate Types", type: "text", aliases: ["category_candidate_types"], protected: true },
  { key: "rawPayload", label: "Raw Payload", type: "text", aliases: ["raw_payload"], protected: true },
] as const;

export const LEAD_FIELD_BY_KEY = new Map(LEAD_FIELD_CATALOG.map((field) => [field.key, field]));

export const LEAD_FIELD_BY_ALIAS = new Map(
  LEAD_FIELD_CATALOG.flatMap((field) =>
    [field.key, ...field.aliases].map((alias) => [
      normalizeFieldName(alias),
      field.key,
    ] as const),
  ),
);

export const IMPORTABLE_LEAD_FIELDS = LEAD_FIELD_CATALOG.filter((field) => !field.protected);

export function normalizeFieldName(value: string): string {
  return value.trim().replace(/^\uFEFF/, "").toLowerCase().replace(/[\s-]+/g, "_");
}

export function resolveLeadField(value: string): string | null {
  return LEAD_FIELD_BY_ALIAS.get(normalizeFieldName(value)) ?? null;
}

export function isProtectedLeadField(value: string): boolean {
  const key = resolveLeadField(value) ?? value;
  return LEAD_FIELD_BY_KEY.get(key)?.protected === true;
}
