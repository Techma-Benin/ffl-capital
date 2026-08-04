import type { Lead } from "@prisma/client";
import { formatStateForIntegrity } from "@/lib/constants/us-states";

const DEFAULT_INTEGRITY_LABEL =
  "Indexed Universal Life [IUL] Facebook (Realtime Lead)";

/**
 * Returns the Integrity Connect `lead_type_thom` string for this lead.
 * Uses the category's configured integrityLabel when available; falls back to
 * the default IUL label so posts are never silently missing this field.
 */
export function resolveIntegrityLabel(
  integrityLabel: string | null | undefined,
): string {
  return integrityLabel ?? DEFAULT_INTEGRITY_LABEL;
}

function str(value: string | null | undefined): string {
  return value ?? "";
}

/**
 * Formats a DOB string to MM/dd/yyyy as required by dob_mmddyyyy_thom.
 * Returns empty string when DOB is missing.
 */
function formatDobMmDdYyyy(dob: string | null): string {
  if (!dob) return "";

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) return dob;

  const isoMatch = dob.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;

  const mdyDash = dob.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (mdyDash) return `${mdyDash[1]}/${mdyDash[2]}/${mdyDash[3]}`;

  return dob;
}

/**
 * Builds the payload for the Integrity Connect RealTime flow.
 * All mapped fields are always included; missing values are sent as empty strings.
 * `integrityLabel` should come from the LeadCategory record for this lead's type.
 */
export function buildIntegrityLeadPayload(
  lead: Lead,
  integrityLabel?: string | null,
): Record<string, string> {
  const payload: Record<string, string> = {
    first_name: str(lead.firstName),
    last_name: str(lead.lastName),
    email: str(lead.email),
    phone_1: str(lead.phone),
    state: formatStateForIntegrity(str(lead.state)),
    lead_type_thom: resolveIntegrityLabel(integrityLabel),
    dob_mmddyyyy_thom: formatDobMmDdYyyy(lead.dob),
    vendor_lead_id_thom: lead.externalId ?? lead.id,
    address_1: str(lead.address),
    city: str(lead.city),
    postal_code: str(lead.zip),
    age: str(lead.age),
    trustedform_cert_url: str(lead.trustedformCertUrl),
    universal_leadid: str(lead.leadidToken),
    ip_address: str(lead.ipAddress),
    has_iul_thom: str(lead.haveIul),
    primary_goal_thom: str(lead.primaryGoal),
    campaign_source: str(lead.source),
    campaign_id: str(lead.subId),
  };

  if (lead.leadType === "mortgage_protection") {
    payload.beneficiary_thom = str(lead.beneficiary);
    payload.history_of_cancer_thom = str(lead.historyOfCancer);
    payload.mortgage_loan_amount_thom = str(lead.mortgageLoanAmount);
  }

  return payload;
}

/**
 * Builds the ping payload for the Integrity Storefront flow.
 * All mapped fields are always included; missing values are sent as empty strings.
 */
export function buildIntegrityPingPayload(
  lead: Lead,
  integrityLabel?: string | null,
): Record<string, string> {
  return {
    first_name: str(lead.firstName),
    last_name: str(lead.lastName),
    state: formatStateForIntegrity(str(lead.state)),
    lead_type_thom: resolveIntegrityLabel(integrityLabel),
    vendor_lead_id_thom: lead.externalId ?? lead.id,
  };
}

/**
 * Builds the full payload for the Integrity Storefront flow.
 */
export function buildIntegrityStorefrontPayload(
  lead: Lead,
  integrityLabel?: string | null,
): Record<string, string> {
  return {
    ...buildIntegrityLeadPayload(lead, integrityLabel),
    vendor_lead_id_thom: lead.externalId ?? lead.id,
  };
}
