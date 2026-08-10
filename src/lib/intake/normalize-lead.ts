import type { IntakePayload } from "./validate-intake";

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
  intent: string | null;
  haveIul: string | null;
  primaryGoal: string | null;
  stateYouCurrentlyLiveIn: string | null;
  beneficiary: string | null;
  beneficiaryType: string | null;
  historyOfCancer: string | null;
  mortgageLoanAmount: string | null;
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

function pickString(...values: (string | undefined)[]): string | null {
  for (const v of values) {
    if (v !== undefined && v !== "") return v;
  }
  return null;
}

export function normalizeLead(payload: IntakePayload): NormalizedLead {
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
    intent,
    haveIul: pickString(payload.Have_IUL, payload.haveIul),
    primaryGoal: pickString(payload.Primary_Goal, payload.primaryGoal),
    beneficiary: pickString(payload.Beneficiary, payload.beneficiary),
    beneficiaryType: pickString(
      payload.beneficiary_type_thom,
      payload.Beneficiary_Type,
      payload.beneficiaryType,
      payload["Beneficiary Type"],
    ),
    historyOfCancer: pickString(
      payload.History_Of_Cancer,
      payload.historyOfCancer,
    ),
    mortgageLoanAmount: pickString(
      payload.Mortgage_Loan_Amount,
      payload.mortgageLoanAmount,
    ),
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
