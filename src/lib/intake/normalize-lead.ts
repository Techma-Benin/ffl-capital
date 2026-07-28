import type { IntakePayload } from "./validate-intake";

export interface LeadCategoryLookup {
  type: string;
  src: string | null;
}

export interface NormalizedLead {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  dob: string | null;
  age: string | null;
  leadType: string;
  intent: string | null;
  haveIul: string | null;
  primaryGoal: string | null;
  stateYouCurrentlyLiveIn: string | null;
  trustedformCertUrl: string | null;
  tcpaConsent: string | null;
  tcpaLanguage: string | null;
  leadidToken: string | null;
  source: string;
  landingPage: string | null;
  subId: string | null;
  pubId: string | null;
  boberdooLeadType: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  externalId: string | null;
  rawPayload: Record<string, unknown>;
}

/**
 * Resolves a lead type string from the LeadCategory table.
 *
 * Priority:
 * 1. Exact `src` match against a known LeadCategory
 * 2. Intent field signals (fallback to seeded type strings)
 * 3. Partial SRC substring (fallback)
 * 4. Default: "traditional_iul"
 */
function resolveLeadType(
  intent: string | undefined,
  source: string | undefined,
  categories: LeadCategoryLookup[],
): string {
  // 1. Exact SRC lookup against configured categories
  if (source) {
    const match = categories.find((c) => c.src === source);
    if (match) return match.type;
  }

  // 2. Intent field signals
  if (intent) {
    const normalized = intent.toLowerCase().trim();
    if (normalized.includes("high intent") || normalized === "high_intent") {
      return "high_intent_iul";
    }
    if (normalized.includes("traditional")) {
      return "traditional_iul";
    }
    if (normalized.includes("mortgage protection")) {
      return "mortgage_protection";
    }
    if (normalized.includes("final expense")) {
      return "final_expense";
    }
  }

  // 3. Partial SRC substring fallback
  if (source) {
    const src = source.toLowerCase();
    if (src.includes("highintent") || src.includes("high_intent")) {
      return "high_intent_iul";
    }
    if (src.includes("mortgage")) {
      return "mortgage_protection";
    }
    if (
      src.includes("veteran") ||
      src.includes("final_expense") ||
      src.includes("finalexpense")
    ) {
      return "final_expense";
    }
  }

  return "traditional_iul";
}

function pickString(...values: (string | undefined)[]): string | null {
  for (const v of values) {
    if (v !== undefined && v !== "") return v;
  }
  return null;
}

export function normalizeLead(
  payload: IntakePayload,
  categories: LeadCategoryLookup[] = [],
): NormalizedLead {
  const firstName = (payload.First_Name ?? payload.firstName)!;
  const lastName = (payload.Last_Name ?? payload.lastName)!;
  const email = (payload.Email ?? payload.email)!;
  const phone = (payload.Primary_Phone ?? payload.phone)!;
  const state = (
    payload.State ??
    payload.State_You_Currently_Live_In ??
    payload.stateYouCurrentlyLiveIn ??
    payload.state
  )!.toUpperCase();
  const intent = pickString(payload.Intent, payload.intent);
  const source = payload.SRC ?? payload.source ?? "meta_leadconduit";

  return {
    firstName,
    lastName,
    email,
    phone,
    address: pickString(payload.Address, payload.address),
    city: pickString(payload.City, payload.city),
    state,
    zip: pickString(payload.Zip, payload.zip),
    dob: pickString(payload.DOB, payload.dob),
    age: pickString(payload.Age, payload.age),
    leadType: resolveLeadType(intent ?? undefined, source, categories),
    intent,
    haveIul: pickString(payload.Have_IUL, payload.haveIul),
    primaryGoal: pickString(payload.Primary_Goal, payload.primaryGoal),
    stateYouCurrentlyLiveIn: pickString(
      payload.State_You_Currently_Live_In,
      payload.stateYouCurrentlyLiveIn,
    )?.toUpperCase() ?? null,
    trustedformCertUrl: pickString(
      payload.Trusted_Form_URL,
      payload.trustedformCertUrl,
      payload.trustedform_cert_url,
      payload.trusted_form_url,
    ),
    tcpaConsent: pickString(payload.TCPA_Consent, payload.tcpaConsent),
    tcpaLanguage: pickString(payload.TCPA_Language, payload.tcpaLanguage),
    leadidToken: pickString(payload.LeadiD_Token, payload.leadidToken),
    source,
    landingPage: pickString(payload.Landing_Page, payload.landingPage),
    subId: pickString(payload.Sub_ID, payload.subId),
    pubId: pickString(payload.Pub_ID, payload.pubId),
    boberdooLeadType: pickString(
      payload.Lead_Type,
      payload.leadTypeBoberdoo,
      payload.boberdooLeadType,
    ),
    ipAddress: pickString(payload.IP_Address, payload.ipAddress),
    userAgent: pickString(payload.User_Agent, payload.userAgent),
    externalId: payload.Unique_Identifier ?? payload.externalId ?? null,
    rawPayload: payload as Record<string, unknown>,
  };
}
