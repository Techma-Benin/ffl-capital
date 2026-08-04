import { z } from "zod";

const optionalString = z.string().optional();

function resolveDob(data: Record<string, unknown>): string | undefined {
  const dob = data.DOB ?? data.dob;
  return typeof dob === "string" && dob.trim() !== "" ? dob.trim() : undefined;
}

function resolveTrustedFormUrl(data: Record<string, unknown>): string | undefined {
  const url =
    data.Trusted_Form_URL ??
    data.trustedformCertUrl ??
    data.trustedform_cert_url ??
    data.trusted_form_url;
  return typeof url === "string" && url.trim() !== "" ? url.trim() : undefined;
}

// NOTE: Have_IUL / Primary_Goal are intentionally NOT enforced here. This
// schema runs before we know the lead's product (that requires a DB lookup
// against LeadCategory in processLeadIntake), and Have_IUL/Primary_Goal only
// apply to IUL products — a Mortgage Protection lead legitimately omits them.
// Only TrustedForm is enforced at intake for every product; full per-product
// completeness (including DOB and Mortgage Protection's Beneficiary/History
// Of Cancer/Mortgage Loan Amount) is checked right before the Integrity post
// in `src/lib/integrity/required-fields.ts`, once the lead's resolved type is
// known.
function missingIntegrityIntakeFields(data: Record<string, unknown>): string[] {
  const missing: string[] = [];
  // Temporarily optional: MP Facebook forms don't collect DOB at intake.
  // Integrity post still validates DOB via required-fields.ts.
  // if (!resolveDob(data)) missing.push("DOB");
  if (!resolveTrustedFormUrl(data)) missing.push("Trusted_Form_URL");
  return missing;
}

/** Accepts Boberdoo-style field names (underscores) from LeadConduit webhook. */
export const intakePayloadSchema = z
  .object({
    // Contact
    First_Name: z.string().min(1).optional(),
    Last_Name: z.string().min(1).optional(),
    Email: z.string().email().optional(),
    Primary_Phone: z.string().min(1).optional(),
    Address: optionalString,
    City: optionalString,
    State: z.string().length(2).optional(),
    Zip: optionalString,
    DOB: optionalString,
    Age: optionalString,
    // IUL business
    Have_IUL: optionalString,
    Primary_Goal: optionalString,
    State_You_Currently_Live_In: z.string().length(2).optional(),
    Intent: optionalString,
    // Mortgage Protection business
    Beneficiary: optionalString,
    History_Of_Cancer: optionalString,
    Mortgage_Loan_Amount: optionalString,
    // Compliance
    Trusted_Form_URL: z.string().url().optional(),
    trustedform_cert_url: z.string().url().optional(),
    trusted_form_url: z.string().url().optional(),
    TCPA_Consent: optionalString,
    TCPA_Language: optionalString,
    LeadiD_Token: optionalString,
    // Tracking / attribution
    SRC: optionalString,
    Landing_Page: optionalString,
    Sub_ID: optionalString,
    Pub_ID: optionalString,
    Unique_Identifier: optionalString,
    Lead_Type: optionalString,
    IP_Address: optionalString,
    User_Agent: optionalString,
    // camelCase fallbacks for dev simulator
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(1).optional(),
    address: optionalString,
    city: optionalString,
    state: z.string().length(2).optional(),
    zip: optionalString,
    dob: optionalString,
    age: optionalString,
    haveIul: optionalString,
    primaryGoal: optionalString,
    stateYouCurrentlyLiveIn: z.string().length(2).optional(),
    intent: optionalString,
    beneficiary: optionalString,
    historyOfCancer: optionalString,
    mortgageLoanAmount: optionalString,
    trustedformCertUrl: z.string().url().optional(),
    tcpaConsent: optionalString,
    tcpaLanguage: optionalString,
    leadidToken: optionalString,
    source: optionalString,
    landingPage: optionalString,
    subId: optionalString,
    pubId: optionalString,
    externalId: optionalString,
    leadTypeBoberdoo: optionalString,
    boberdooLeadType: optionalString,
    ipAddress: optionalString,
    userAgent: optionalString,
  })
  .passthrough()
  .refine(
    (data) => {
      const firstName = data.First_Name ?? data.firstName;
      const lastName = data.Last_Name ?? data.lastName;
      const email = data.Email ?? data.email;
      const phone = data.Primary_Phone ?? data.phone;
      const state =
        data.State ??
        data.State_You_Currently_Live_In ??
        data.stateYouCurrentlyLiveIn ??
        data.state;
      return !!(firstName && lastName && email && phone && state);
    },
    {
      message:
        "Missing required fields: firstName, lastName, email, phone, state",
    },
  )
  .refine(
    (data) => missingIntegrityIntakeFields(data).length === 0,
    (data) => ({
      message: `Missing required fields: ${missingIntegrityIntakeFields(data).join(", ")}`,
    }),
  );

export type IntakePayload = z.infer<typeof intakePayloadSchema>;

export const leadConduitResponseSchema = z.object({
  outcome: z.enum(["success", "error"]),
  reason: z.string(),
});

export type LeadConduitResponse = z.infer<typeof leadConduitResponseSchema>;
