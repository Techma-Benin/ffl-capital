import type { Lead } from "@prisma/client";

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

/**
 * Formats a DOB string to MM/dd/yyyy as required by dob_mmddyyyy_thom.
 */
function formatDobMmDdYyyy(dob: string | null): string | undefined {
  if (!dob) return undefined;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) return dob;

  const isoMatch = dob.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;

  const mdyDash = dob.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (mdyDash) return `${mdyDash[1]}/${mdyDash[2]}/${mdyDash[3]}`;

  return dob;
}

/**
 * Builds the payload for the Integrity Connect RealTime flow.
 * `integrityLabel` should come from the LeadCategory record for this lead's type.
 */
export function buildIntegrityLeadPayload(
  lead: Lead,
  integrityLabel?: string | null,
): Record<string, string | undefined> {
  const payload: Record<string, string | undefined> = {
    first_name: lead.firstName,
    last_name: lead.lastName,
    email: lead.email,
    phone_1: lead.phone,
    state: lead.state,
    lead_type_thom: resolveIntegrityLabel(integrityLabel),
    dob_mmddyyyy_thom: formatDobMmDdYyyy(lead.dob),
    vendor_lead_id_thom: lead.externalId ?? lead.id,
    address_1: lead.address ?? undefined,
    city: lead.city ?? undefined,
    postal_code: lead.zip ?? undefined,
    age: lead.age ?? undefined,
    trustedform_cert_url: lead.trustedformCertUrl ?? undefined,
    universal_leadid: lead.leadidToken ?? undefined,
    ip_address: lead.ipAddress ?? undefined,
    has_iul_thom: lead.haveIul ?? undefined,
    primary_goal_thom: lead.primaryGoal ?? undefined,
    campaign_source: lead.source ?? undefined,
    campaign_id: lead.subId ?? undefined,
  };

  return Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined),
  ) as Record<string, string>;
}

/**
 * Builds the ping payload for the Integrity Storefront flow.
 */
export function buildIntegrityPingPayload(
  lead: Lead,
  integrityLabel?: string | null,
): Record<string, string | undefined> {
  return {
    first_name: lead.firstName,
    last_name: lead.lastName,
    state: lead.state,
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
): Record<string, string | undefined> {
  return {
    ...buildIntegrityLeadPayload(lead, integrityLabel),
    vendor_lead_id_thom: lead.externalId ?? lead.id,
  };
}
