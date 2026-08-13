import { classifyImportedLead } from "@/lib/migration/import-category-classification";
import type { LeadCategoryRule } from "@/lib/lead-categories/flexible-lead-categories";
import {
  isProtectedLeadField,
  LEAD_FIELD_BY_KEY,
  normalizeFieldName,
  resolveLeadField,
} from "@/lib/leads/field-catalog";

function pick(row: Record<string, string>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (value) return value;
  }
  return null;
}

function resolveBoberdooLeadType(row: Record<string, string>): string | null {
  const explicit = pick(row, "boberdoo_lead_type", "lead_type_id");
  if (explicit) return explicit;
  const leadType = row.lead_type;
  if (leadType && /^\d+$/.test(leadType)) return leadType;
  return null;
}

export function mapCsvRowToLead(
  row: Record<string, string>,
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
