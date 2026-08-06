import { LeadType } from "@prisma/client";
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
  leadType: LeadType;
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

function resolveLeadType(
  intent: string | undefined,
  source: string | undefined,
): LeadType {
  if (intent) {
    const normalized = intent.toLowerCase().trim();
    if (normalized.includes("high intent") || normalized === "high_intent") {
      return LeadType.high_intent_iul;
    }
    if (normalized.includes("traditional")) {
      return LeadType.traditional_iul;
    }
  }

  if (source) {
    const src = source.toLowerCase();
    if (src.includes("highintent") || src.includes("high_intent")) {
      return LeadType.high_intent_iul;
    }
  }

  return LeadType.traditional_iul;
}

function pickString(
  ...values: (string | undefined)[]
): string | null {
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
    leadType: resolveLeadType(intent ?? undefined, source),
    intent,
    haveIul: pickString(payload.Have_IUL, payload.haveIul),
    primaryGoal: pickString(payload.Primary_Goal, payload.primaryGoal),
    stateYouCurrentlyLiveIn: pickString(
      payload.State_You_Currently_Live_In,
      payload.stateYouCurrentlyLiveIn,
    )?.toUpperCase() ?? null,
    trustedformCertUrl:
      payload.Trusted_Form_URL ?? payload.trustedformCertUrl ?? null,
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
