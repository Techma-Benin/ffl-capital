import { classifyImportedLead } from "@/lib/migration/import-category-classification";
import type { LeadCategoryRule } from "@/lib/lead-categories/flexible-lead-categories";
import {
  isProtectedLeadField,
  LEAD_FIELD_BY_KEY,
  normalizeFieldName,
  resolveLeadField,
} from "@/lib/leads/field-catalog";

type CsvRow = Record<string, string>;

function pick(row: CsvRow, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (value) return value;
  }
  return null;
}

function resolveBoberdooLeadType(row: CsvRow): string | null {
  const explicit = pick(row, "boberdoo_lead_type", "lead_type_id");
  if (explicit) return explicit;
  const leadType = row.lead_type;
  if (leadType && /^\d+$/.test(leadType)) return leadType;
  return null;
}

export function mapCsvRowToLead(
  row: CsvRow,
  categories: LeadCategoryRule[],
) {
  const state = (pick(row, "state", "state_you_currently_live_in") ?? "")
    .toUpperCase()
    .slice(0, 2);

  const rawPayload: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    if (!isProtectedLeadField(key)) rawPayload[key] = value;
  }
  const classification = classifyImportedLead(rawPayload, categories);

  return {
    firstName: pick(row, "first_name", "firstname") ?? "",
    lastName: pick(row, "last_name", "lastname") ?? "",
    email: pick(row, "email") ?? "",
    phone: pick(row, "phone", "primary_phone") ?? "0000000000",
    address: pick(row, "address"),
    city: pick(row, "city"),
    state,
    zip: pick(row, "zip"),
    dob: pick(row, "dob", "date_of_birth"),
    age: pick(row, "age"),
    leadType: classification.leadType,
    categoryResolution: classification.categoryResolution,
    categoryCandidateTypes: classification.categoryCandidateTypes,
    status: classification.status,
    available: classification.available,
    intent: pick(row, "intent"),
    haveIul: pick(row, "have_iul", "haveiul"),
    primaryGoal: pick(row, "primary_goal", "primarygoal"),
    stateYouCurrentlyLiveIn:
      pick(row, "state_you_currently_live_in")?.toUpperCase().slice(0, 2) ??
      null,
    beneficiary: pick(row, "beneficiary", "beneficiary_thom"),
    beneficiaryType: pick(
      row,
      "beneficiary_type",
      "beneficiary_type_thom",
      "relationship_of_beneficiary",
    ),
    historyOfCancer: pick(row, "history_of_cancer", "history_of_cancer_thom"),
    mortgageLoanAmount: pick(
      row,
      "mortgage_loan_amount",
      "mortgage_loan_amount_thom",
      "mortgage.loan.amount",
    ),
    trustedformCertUrl: pick(
      row,
      "trustedform_cert_url",
      "trusted_form_url",
    ),
    tcpaConsent: pick(row, "tcpa_consent"),
    tcpaLanguage: pick(row, "tcpa_language"),
    leadidToken: pick(row, "leadid_token", "leadi_d_token"),
    source: pick(row, "source", "src") ?? "boberdoo_migration",
    landingPage: pick(row, "landing_page"),
    subId: pick(row, "sub_id"),
    pubId: pick(row, "pub_id"),
    boberdooLeadType: resolveBoberdooLeadType(row),
    ipAddress: pick(row, "ip_address"),
    userAgent: pick(row, "user_agent"),
    externalId: pick(row, "external_id", "unique_identifier"),
    receivedAt: row.received_at ? new Date(row.received_at) : new Date(),
    rawPayload,
  };
}

const FULL_MIGRATION_REQUIRED_FIELDS = new Set(["id", "rawPayload"]);

/** Full exports are self-describing and must bypass the manual field mapper. */
export function isFullMigrationCsv(headers: string[]): boolean {
  const fields = new Set(
    headers.map((header) => resolveLeadField(normalizeFieldName(header)) ?? normalizeFieldName(header)),
  );
  return [...FULL_MIGRATION_REQUIRED_FIELDS].every((field) => fields.has(field));
}

function nullableText(value: string | undefined): string | null {
  return value === undefined || value === "" ? null : value;
}

function nullableDate(value: string | undefined): Date | null {
  if (value === undefined || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date "${value}"`);
  return date;
}

function dateOrNow(value: string | undefined): Date {
  return nullableDate(value) ?? new Date();
}

function booleanValue(value: string | undefined, field: string): boolean | null {
  if (value === undefined || value === "") return null;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  throw new Error(`Invalid boolean for ${field}: "${value}"`);
}

function integerValue(value: string | undefined, field: string, fallback = 0): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`Invalid integer for ${field}: "${value}"`);
  return parsed;
}

function arrayValue(value: string | undefined, field: string): string[] {
  if (value === undefined || value === "") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`Invalid JSON for ${field}`);
  }
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new Error(`Invalid string array for ${field}`);
  }
  return parsed;
}

/**
 * Restores a full migration row when present. Missing system fields are derived
 * so a row can import as soon as first/email/state plus raw_payload or lead_type
 * are available.
 */
export function mapFullMigrationRow(
  row: CsvRow,
  categories: LeadCategoryRule[] = [],
) {
  const field = (key: string) => {
    const definition = LEAD_FIELD_BY_KEY.get(key);
    return row[definition?.aliases[0] ?? key] ?? row[key];
  };

  const rawPayloadText = field("rawPayload");
  let rawPayload: Record<string, unknown>;
  if (rawPayloadText) {
    try {
      const parsed = JSON.parse(rawPayloadText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Invalid JSON in raw_payload");
      }
      rawPayload = parsed as Record<string, unknown>;
    } catch (err) {
      if (err instanceof Error && err.message === "Invalid JSON in raw_payload") throw err;
      throw new Error("Invalid JSON in raw_payload");
    }
  } else {
    const leadType = nullableText(field("leadType"));
    if (!leadType) {
      throw new Error("Missing raw_payload or lead_type");
    }
    rawPayload = { lead_type: leadType };
  }

  const classification = classifyImportedLead(rawPayload, categories);
  const allowedStatuses = new Set([
    "unmatched",
    "delivered",
    "integrity_posted",
    "dead",
    "review",
  ]);
  const allowedResolutions = new Set(["matched", "no_match", "multiple_matches"]);
  const statusValue = field("status");
  const resolutionValue = field("categoryResolution");
  if (statusValue && !allowedStatuses.has(statusValue)) {
    throw new Error(`Invalid status "${statusValue}"`);
  }
  if (resolutionValue && !allowedResolutions.has(resolutionValue)) {
    throw new Error(`Invalid category resolution "${resolutionValue}"`);
  }

  const id = nullableText(field("id"));
  const explicitLeadType = nullableText(field("leadType"));

  return {
    ...(id ? { id } : {}),
    externalId: nullableText(field("externalId")),
    firstName: field("firstName") ?? "",
    lastName: field("lastName") ?? "",
    email: field("email") ?? "",
    phone: field("phone") ?? "0000000000",
    address: nullableText(field("address")),
    city: nullableText(field("city")),
    state: field("state") ?? "",
    zip: nullableText(field("zip")),
    dob: nullableText(field("dob")),
    age: nullableText(field("age")),
    leadType: explicitLeadType ?? classification.leadType,
    categoryResolution: (resolutionValue ??
      classification.categoryResolution) as
      | "matched"
      | "no_match"
      | "multiple_matches",
    categoryCandidateTypes:
      field("categoryCandidateTypes") !== undefined &&
      field("categoryCandidateTypes") !== ""
        ? arrayValue(field("categoryCandidateTypes"), "category_candidate_types")
        : classification.categoryCandidateTypes,
    intent: nullableText(field("intent")),
    haveIul: nullableText(field("haveIul")),
    primaryGoal: nullableText(field("primaryGoal")),
    stateYouCurrentlyLiveIn: nullableText(field("stateYouCurrentlyLiveIn")),
    beneficiary: nullableText(field("beneficiary")),
    beneficiaryType: nullableText(field("beneficiaryType")),
    historyOfCancer: nullableText(field("historyOfCancer")),
    mortgageLoanAmount: nullableText(field("mortgageLoanAmount")),
    trustedformCertUrl: nullableText(field("trustedformCertUrl")),
    trustedformValid: booleanValue(field("trustedformValid"), "trustedform_valid"),
    trustedformCheckedAt: nullableDate(field("trustedformCheckedAt")),
    tcpaConsent: nullableText(field("tcpaConsent")),
    tcpaLanguage: nullableText(field("tcpaLanguage")),
    leadidToken: nullableText(field("leadidToken")),
    source: field("source") || "boberdoo_migration",
    landingPage: nullableText(field("landingPage")),
    subId: nullableText(field("subId")),
    pubId: nullableText(field("pubId")),
    boberdooLeadType: nullableText(field("boberdooLeadType")),
    ipAddress: nullableText(field("ipAddress")),
    userAgent: nullableText(field("userAgent")),
    receivedAt: dateOrNow(field("receivedAt")),
    available:
      booleanValue(field("available"), "available") ?? classification.available,
    refundable: booleanValue(field("refundable"), "refundable") ?? true,
    status: (statusValue ?? classification.status) as
      | "unmatched"
      | "delivered"
      | "integrity_posted"
      | "dead"
      | "review",
    rawPayload,
    agedSaleCount: integerValue(field("agedSaleCount"), "aged_sale_count"),
    agedAvailableAfter: nullableDate(field("agedAvailableAfter")),
    liveSoldAt: nullableDate(field("liveSoldAt")),
    liveSaleChannel: nullableText(field("liveSaleChannel")),
    lastRoutingAttemptAt: nullableDate(field("lastRoutingAttemptAt")),
    nextRoutingAttemptAt: nullableDate(field("nextRoutingAttemptAt")),
    routingAttemptCount: integerValue(field("routingAttemptCount"), "routing_attempt_count"),
    integrityBlockedAt: nullableDate(field("integrityBlockedAt")),
    integrityBlockedReason: nullableText(field("integrityBlockedReason")),
    routingClaimedAt: nullableDate(field("routingClaimedAt")),
    routingClaimedBy: nullableText(field("routingClaimedBy")),
    routingClaimExpiresAt: nullableDate(field("routingClaimExpiresAt")),
    createdAt: dateOrNow(field("createdAt")),
    updatedAt: dateOrNow(field("updatedAt")),
  };
}

export function normalizeImportedRow(
  row: Record<string, string>,
): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [header, value] of Object.entries(row)) {
    const field = resolveLeadField(normalizeFieldName(header));
    if (field && !isProtectedLeadField(field)) {
      normalized[LEAD_FIELD_BY_KEY.get(field)?.aliases[0] ?? field] = value;
    } else if (!field) {
      normalized[header] = value;
    }
  }
  return normalized;
}
