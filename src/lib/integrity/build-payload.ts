import type { Lead } from "@prisma/client";
import { formatStateForIntegrity } from "@/lib/constants/us-states";

export type IntegrityResaleMode = "realtime" | "storefront";

export type IntegrityLabelSources = {
  realtime?: string | null;
  storefront?: string | null;
};

function nonBlank(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function resolveIntegrityLabel(
  integrityLabel: string | null | undefined,
): string | undefined {
  return nonBlank(integrityLabel);
}

export function resolveIntegrityLabelForMode(
  mode: IntegrityResaleMode,
  labels: IntegrityLabelSources,
): string | undefined {
  if (mode === "storefront") {
    const storefront = nonBlank(labels.storefront);
    if (storefront) return storefront;
  }
  return resolveIntegrityLabel(labels.realtime);
}

export function buildLeadTypeThomOptions(
  mode: IntegrityResaleMode,
  categories: Array<{
    integrityLabel?: string | null;
    integrityLabelStorefront?: string | null;
  }>,
  categoryForLead?: {
    integrityLabel?: string | null;
    integrityLabelStorefront?: string | null;
  } | null,
): string[] {
  const pool = categoryForLead != null ? [categoryForLead] : categories;

  const values = new Set<string>();
  for (const category of pool) {
    if (mode === "storefront") {
      const storefront = nonBlank(category.integrityLabelStorefront);
      const realtime = nonBlank(category.integrityLabel);
      if (storefront) values.add(storefront);
      if (realtime) values.add(realtime);
    } else {
      const realtime = nonBlank(category.integrityLabel);
      if (realtime) values.add(realtime);
    }
  }

  return [...values].sort((a, b) => a.localeCompare(b));
}

function formatDobMmDdYyyy(dob: string | null): string | undefined {
  if (!dob) return undefined;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) return dob;

  const isoMatch = dob.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;

  const mdyDash = dob.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (mdyDash) return `${mdyDash[1]}/${mdyDash[2]}/${mdyDash[3]}`;

  return dob;
}

function formatDobMdY(dob: string | null): string | undefined {
  if (!dob) return undefined;

  const mmddyyyy = formatDobMmDdYyyy(dob);
  if (!mmddyyyy) return undefined;

  const match = mmddyyyy.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return mmddyyyy;

  return `${Number(match[1])}/${Number(match[2])}/${match[3]}`;
}

function formatLeadDateThom(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function extractTrustedFormCertId(
  trustedformCertUrl: string | null | undefined,
): string | undefined {
  if (!trustedformCertUrl) return undefined;
  const trimmed = trustedformCertUrl.trim();
  if (!trimmed) return undefined;
  const parts = trimmed.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

function pickRawString(
  rawPayload: unknown,
  ...keys: string[]
): string | undefined {
  if (!rawPayload || typeof rawPayload !== "object") return undefined;
  const record = rawPayload as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function resolveVendorLeadId(
  lead: Lead,
  mode: IntegrityResaleMode,
): string | undefined {
  if (lead.leadType === "mortgage_protection") {
    return (
      extractTrustedFormCertId(lead.trustedformCertUrl) ??
      lead.externalId ??
      lead.id
    );
  }
  return lead.externalId ?? lead.id;
}

export function encodeIntegrityFormBody(
  data: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) params.append(key, value);
  }
  return params.toString();
}

export function buildRealtimeIulPingPayload(
  lead: Lead,
  leadTypeThom: string,
): Record<string, string> {
  return {
    state: formatStateForIntegrity(lead.state),
    postal_code: lead.zip ?? "",
    lead_type_thom: leadTypeThom,
  };
}

export function buildIntegrityLeadPayload(
  lead: Lead,
  integrityLabel?: string | null,
  options?: { mode?: IntegrityResaleMode },
): Record<string, string | undefined> {
  const mode = options?.mode ?? "realtime";
  const leadTypeThom = resolveIntegrityLabel(integrityLabel);
  const vendorLeadId = resolveVendorLeadId(lead, mode);

  const payload: Record<string, string | undefined> = {
    first_name: lead.firstName,
    last_name: lead.lastName,
    email: lead.email,
    phone_1: lead.phone,
    state: formatStateForIntegrity(lead.state),
    lead_type_thom: leadTypeThom,
    dob: formatDobMdY(lead.dob),
    dob_mmddyyyy_thom: formatDobMmDdYyyy(lead.dob),
    vendor_lead_id_thom: vendorLeadId,
    address_1: lead.address ?? "",
    city: lead.city ?? undefined,
    postal_code: lead.zip ?? undefined,
    age: lead.age ?? undefined,
    trustedform_cert_url: lead.trustedformCertUrl ?? undefined,
    universal_leadid: lead.leadidToken ?? undefined,
    ip_address: lead.ipAddress ?? undefined,
    tcpa_compliance_thom: lead.tcpaConsent ?? undefined,
    lead_date_thom: formatLeadDateThom(lead.receivedAt),
    campaign_source: lead.source ?? undefined,
    campaign_id: lead.subId ?? undefined,
  };

  if (lead.leadType?.includes("iul")) {
    payload.has_iul_thom = lead.haveIul ?? undefined;
    payload.primary_goal_thom = lead.primaryGoal ?? undefined;
  }

  if (lead.leadType === "mortgage_protection") {
    payload.beneficiary_thom = lead.beneficiary ?? undefined;
    payload.history_of_cancer_thom = lead.historyOfCancer ?? undefined;
    payload["mortgage.loan.amount"] = lead.mortgageLoanAmount ?? undefined;
    payload.monthly_payment_thom = pickRawString(
      lead.rawPayload,
      "Monthly_Mortgage_Payment",
      "monthlyMortgagePayment",
      "monthly_mortgage_payment",
    );
  }

  if (lead.leadType === "final_expense") {
    payload.beneficiary_thom = lead.beneficiary ?? undefined;
  }

  const militaryService = pickRawString(
    lead.rawPayload,
    "Military_Service",
    "militaryService",
    "is_military",
  );
  if (militaryService) {
    payload.is_military = militaryService;
  }

  return Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined),
  ) as Record<string, string>;
}

/** @deprecated Storefront no longer uses a LeadConduit ping gate. */
export function buildIntegrityPingPayload(
  lead: Lead,
  integrityLabel?: string | null,
  labelSources?: IntegrityLabelSources,
): Record<string, string | undefined> {
  const lead_type_thom = labelSources
    ? resolveIntegrityLabelForMode("storefront", labelSources)
    : resolveIntegrityLabel(integrityLabel);

  return {
    first_name: lead.firstName,
    last_name: lead.lastName,
    state: formatStateForIntegrity(lead.state),
    lead_type_thom,
    vendor_lead_id_thom: lead.externalId ?? lead.id,
  };
}

export function buildIntegrityStorefrontPayload(
  lead: Lead,
  integrityLabel?: string | null,
  labelSources?: IntegrityLabelSources,
): Record<string, string | undefined> {
  const sources: IntegrityLabelSources = labelSources ?? {
    realtime: integrityLabel,
  };
  const resolved = resolveIntegrityLabelForMode("storefront", sources);

  return {
    ...buildIntegrityLeadPayload(lead, sources.realtime, { mode: "storefront" }),
    lead_type_thom: resolved,
    vendor_lead_id_thom: resolveVendorLeadId(lead, "storefront"),
  };
}
