import type { Lead } from "@prisma/client";

/**
 * Fields Integrity requires on every real-time/storefront post, regardless
 * of product. Missing these causes a vendor-side rejection even though our
 * payload builder happily includes them when present.
 */
type RequiredLeadField = Exclude<keyof RequiredFieldsLeadInput, "leadType">;

const BASE_REQUIRED_FIELDS: Array<{ field: RequiredLeadField; label: string }> = [
  { field: "dob", label: "DOB" },
  { field: "trustedformCertUrl", label: "TrustedForm certificate URL" },
  { field: "haveIul", label: "Have_IUL" },
  { field: "primaryGoal", label: "Primary_Goal" },
];

/**
 * Additional fields required per product (lead type), on top of the base
 * set above. Keyed by the `leadType` string used throughout the app.
 */
const PRODUCT_REQUIRED_FIELDS: Record<
  string,
  Array<{ field: RequiredLeadField; label: string }>
> = {
  mortgage_protection: [
    { field: "beneficiary", label: "Beneficiary" },
    { field: "historyOfCancer", label: "History Of Cancer" },
    { field: "mortgageLoanAmount", label: "Mortgage Loan Amount" },
  ],
};

export interface RequiredFieldDefinition {
  field: RequiredLeadField;
  label: string;
}

/** Minimal shape needed to run the required-fields check against a lead. */
export type RequiredFieldsLeadInput = Pick<
  Lead,
  | "leadType"
  | "dob"
  | "trustedformCertUrl"
  | "haveIul"
  | "primaryGoal"
  | "beneficiary"
  | "historyOfCancer"
  | "mortgageLoanAmount"
>;

/**
 * Returns the full list of fields required for Integrity to accept a post
 * for the given lead type (base fields + any product-specific fields).
 */
export function getRequiredIntegrityFields(
  leadType: string,
): RequiredFieldDefinition[] {
  return [...BASE_REQUIRED_FIELDS, ...(PRODUCT_REQUIRED_FIELDS[leadType] ?? [])];
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === "";
}

/**
 * Checks a lead against the required fields for its product. Returns the
 * human-readable labels of any missing fields so the gap can be recorded
 * and surfaced to admins before the vendor ever sees (and rejects) the post.
 */
export function checkRequiredIntegrityFields(lead: RequiredFieldsLeadInput): {
  ok: boolean;
  missing: string[];
} {
  const required = getRequiredIntegrityFields(lead.leadType);
  const missing = required
    .filter((r) => isBlank(lead[r.field]))
    .map((r) => r.label);

  return { ok: missing.length === 0, missing };
}
