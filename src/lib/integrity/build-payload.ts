import type { Lead } from "@prisma/client";
import { formatStateForIntegrity } from "@/lib/constants/us-states";

/** Default Realtime `lead_type_thom` when a category has no Realtime label. */
export const DEFAULT_INTEGRITY_REALTIME_LABEL =
  "Indexed Universal Life [IUL] Facebook (Realtime Lead)";

/** Client-confirmed Storefront `lead_type_thom` for IUL categories (Boberdoo wizard 273). */
export const DEFAULT_INTEGRITY_STOREFRONT_IUL_LABEL = "Diamond IUL Lead";

const DEFAULT_INTEGRITY_LABEL = DEFAULT_INTEGRITY_REALTIME_LABEL;

/** Confirmed Boberdoo Realtime labels for the admin Integrity test picker. */
export const KNOWN_REALTIME_LEAD_TYPE_THOM = [
  DEFAULT_INTEGRITY_REALTIME_LABEL,
  "Final Expense Facebook (Realtime Lead)",
  "Mortgage Protection Facebook (Realtime Lead)",
  "Veteran Final Expense Lead (Realtime Lead)",
  "Veteran Life Facebook (Realtime Lead)",
] as const;

/** Confirmed Boberdoo Storefront labels for the admin Integrity test picker. */
export const KNOWN_STOREFRONT_LEAD_TYPE_THOM = [
  DEFAULT_INTEGRITY_STOREFRONT_IUL_LABEL,
  "Diamond Mortgage Protection Lead",
  "Veteran Final Expense Lead",
  "Final Expense",
] as const;

/** Storefront label when category `integrity_label_storefront` is blank (by category type). */
const INTEGRITY_STOREFRONT_DEFAULT_BY_CATEGORY: Record<string, string> = {
  traditional_iul: DEFAULT_INTEGRITY_STOREFRONT_IUL_LABEL,
  high_intent_iul: DEFAULT_INTEGRITY_STOREFRONT_IUL_LABEL,
};

export type IntegrityResaleMode = "realtime" | "storefront";

export type IntegrityLabelSources = {
  realtime?: string | null;
  storefront?: string | null;
};

function nonBlank(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Returns the Integrity Connect `lead_type_thom` string for Realtime posts.
 * Uses the category's configured Realtime label when available; falls back to
 * the default IUL label so posts are never silently missing this field.
 */
export function resolveIntegrityLabel(
  integrityLabel: string | null | undefined,
): string {
  return nonBlank(integrityLabel) ?? DEFAULT_INTEGRITY_LABEL;
}

/**
 * Resolves `lead_type_thom` for Realtime or Storefront.
 * Storefront: category Storefront label → product default (IUL: Diamond IUL Lead) → Realtime → default.
 */
export function resolveIntegrityLabelForMode(
  mode: IntegrityResaleMode,
  labels: IntegrityLabelSources,
  categoryType?: string | null,
): string {
  if (mode === "storefront") {
    const storefront = nonBlank(labels.storefront);
    if (storefront) return storefront;
    const typeKey = categoryType?.trim();
    if (typeKey && INTEGRITY_STOREFRONT_DEFAULT_BY_CATEGORY[typeKey]) {
      return INTEGRITY_STOREFRONT_DEFAULT_BY_CATEGORY[typeKey];
    }
  }
  return resolveIntegrityLabel(labels.realtime);
}

export function buildLeadTypeThomOptions(
  mode: IntegrityResaleMode,
  categories: Array<{
    integrityLabel?: string | null;
    integrityLabelStorefront?: string | null;
  }>,
  currentValue?: string | null,
): string[] {
  const known =
    mode === "storefront"
      ? KNOWN_STOREFRONT_LEAD_TYPE_THOM
      : KNOWN_REALTIME_LEAD_TYPE_THOM;

  const fromCategories =
    mode === "storefront"
      ? categories.map((c) => nonBlank(c.integrityLabelStorefront))
      : categories.map((c) => nonBlank(c.integrityLabel));

  const values = new Set<string>([...known]);
  for (const label of fromCategories) {
    if (label) values.add(label);
  }
  const current = nonBlank(currentValue);
  if (current) values.add(current);
  return [...values].sort((a, b) => a.localeCompare(b));
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
 * Formats a DOB string to m/d/Y as used by Boberdoo’s `dob` LeadConduit field.
 */
function formatDobMdY(dob: string | null): string | undefined {
  if (!dob) return undefined;

  const mmddyyyy = formatDobMmDdYyyy(dob);
  if (!mmddyyyy) return undefined;

  const match = mmddyyyy.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return mmddyyyy;

  return `${Number(match[1])}/${Number(match[2])}/${match[3]}`;
}

/**
 * Encodes an Integrity payload as `application/x-www-form-urlencoded`.
 * Preserves empty string values (notably `address_1`) so they are not dropped.
 */
export function encodeIntegrityFormBody(
  data: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) params.append(key, value);
  }
  return params.toString();
}

/**
 * Builds the payload for the Integrity Connect RealTime flow.
 * Optional fields with no value are omitted except `address_1`, which is always
 * included (empty string when the lead has no address).
 * `integrityLabel` should come from the LeadCategory Realtime label for this lead's type.
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
    state: formatStateForIntegrity(lead.state),
    lead_type_thom: resolveIntegrityLabel(integrityLabel),
    dob: formatDobMdY(lead.dob),
    dob_mmddyyyy_thom: formatDobMmDdYyyy(lead.dob),
    vendor_lead_id_thom: lead.externalId ?? lead.id,
    address_1: lead.address ?? "",
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
    ...(lead.leadType === "mortgage_protection"
      ? {
          beneficiary_thom: lead.beneficiary ?? undefined,
          history_of_cancer_thom: lead.historyOfCancer ?? undefined,
          mortgage_loan_amount_thom: lead.mortgageLoanAmount ?? undefined,
        }
      : {}),
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
  labelSources?: IntegrityLabelSources,
): Record<string, string | undefined> {
  const lead_type_thom = labelSources
    ? resolveIntegrityLabelForMode("storefront", labelSources, lead.leadType)
    : resolveIntegrityLabel(integrityLabel);

  return {
    first_name: lead.firstName,
    last_name: lead.lastName,
    state: formatStateForIntegrity(lead.state),
    lead_type_thom,
    vendor_lead_id_thom: lead.externalId ?? lead.id,
  };
}

/**
 * Builds the full payload for the Integrity Storefront flow.
 * Uses the Storefront label when set; otherwise falls back to Realtime.
 */
export function buildIntegrityStorefrontPayload(
  lead: Lead,
  integrityLabel?: string | null,
  labelSources?: IntegrityLabelSources,
): Record<string, string | undefined> {
  const sources: IntegrityLabelSources = labelSources ?? {
    realtime: integrityLabel,
  };
  const resolved = resolveIntegrityLabelForMode(
    "storefront",
    sources,
    lead.leadType,
  );

  return {
    ...buildIntegrityLeadPayload(lead, sources.realtime),
    lead_type_thom: resolved,
    vendor_lead_id_thom: lead.externalId ?? lead.id,
  };
}
