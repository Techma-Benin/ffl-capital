import type { Lead } from "@prisma/client";
import type { IntegrityResaleMode } from "./build-payload";

/**
 * Advisory field checks for admin UI warnings (Integrity test panel lead picker).
 * Does NOT block outbound HTTP — posts go to LeadConduit regardless; vendor
 * accept/reject responses are recorded from the LC response body.
 */

export type RequiredFieldContext = {
  mode: IntegrityResaleMode;
  leadType: string | null;
};

type RequiredLeadField = Exclude<keyof RequiredFieldsLeadInput, "leadType">;

const BASE_REQUIRED_FIELDS: Array<{ field: RequiredLeadField; label: string }> = [
  { field: "dob", label: "DOB" },
  { field: "trustedformCertUrl", label: "TrustedForm certificate URL" },
];

const IUL_REQUIRED_FIELDS: Array<{ field: RequiredLeadField; label: string }> = [
  { field: "haveIul", label: "Have_IUL" },
  { field: "primaryGoal", label: "Primary_Goal" },
];

const PRODUCT_REQUIRED_FIELDS: Record<
  string,
  Array<{ field: RequiredLeadField; label: string }>
> = {
  mortgage_protection: [
    { field: "beneficiaryType", label: "Beneficiary Type" },
    { field: "historyOfCancer", label: "History Of Cancer" },
    { field: "mortgageLoanAmount", label: "Mortgage Loan Amount" },
  ],
  final_expense: [{ field: "beneficiary", label: "Beneficiary" }],
};

export interface RequiredFieldDefinition {
  field: RequiredLeadField;
  label: string;
}

export type RequiredFieldsLeadInput = Pick<
  Lead,
  | "leadType"
  | "dob"
  | "trustedformCertUrl"
  | "haveIul"
  | "primaryGoal"
  | "beneficiary"
  | "beneficiaryType"
  | "historyOfCancer"
  | "mortgageLoanAmount"
>;

function isIulLeadType(leadType: string | null): boolean {
  if (!leadType) return false;
  return leadType.includes("iul");
}

export function getRequiredIntegrityFields(
  context: RequiredFieldContext,
): RequiredFieldDefinition[] {
  const { mode, leadType } = context;
  const fields = [...BASE_REQUIRED_FIELDS];

  if (mode === "realtime" && isIulLeadType(leadType)) {
    fields.push(...IUL_REQUIRED_FIELDS);
  }

  if (leadType && PRODUCT_REQUIRED_FIELDS[leadType]) {
    fields.push(...PRODUCT_REQUIRED_FIELDS[leadType]!);
  }

  return fields;
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === "";
}

export function checkRequiredIntegrityFields(
  lead: RequiredFieldsLeadInput,
  mode: IntegrityResaleMode = "realtime",
): {
  ok: boolean;
  missing: string[];
} {
  const required = getRequiredIntegrityFields({
    mode,
    leadType: lead.leadType,
  });
  const missing = required
    .filter((r) => isBlank(lead[r.field]))
    .map((r) => r.label);

  return { ok: missing.length === 0, missing };
}
