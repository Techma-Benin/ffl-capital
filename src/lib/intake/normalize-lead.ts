import { LeadType } from "@prisma/client";
import type { IntakePayload } from "./validate-intake";

export interface NormalizedLead {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  state: string;
  leadType: LeadType;
  trustedformCertUrl: string | null;
  source: string;
  externalId: string | null;
  rawPayload: Record<string, unknown>;
}

function resolveLeadType(intent: string | undefined): LeadType {
  if (!intent) return LeadType.traditional_iul;
  const normalized = intent.toLowerCase().trim();
  if (normalized.includes("high intent") || normalized === "high_intent") {
    return LeadType.high_intent_iul;
  }
  return LeadType.traditional_iul;
}

export function normalizeLead(payload: IntakePayload): NormalizedLead {
  const firstName = (payload.First_Name ?? payload.firstName)!;
  const lastName = (payload.Last_Name ?? payload.lastName)!;
  const email = (payload.Email ?? payload.email)!;
  const phone = (payload.Primary_Phone ?? payload.phone)!;
  const state = (
    payload.State ??
    payload.State_You_Currently_Live_In ??
    payload.state
  )!.toUpperCase();
  const intent = payload.Intent ?? payload.intent;
  const trustedformCertUrl =
    payload.Trusted_Form_URL ?? payload.trustedformCertUrl ?? null;
  const externalId = payload.Unique_Identifier ?? payload.externalId ?? null;
  const source = payload.SRC ?? payload.source ?? "meta_leadconduit";

  return {
    firstName,
    lastName,
    email,
    phone,
    state,
    leadType: resolveLeadType(intent),
    trustedformCertUrl,
    source,
    externalId,
    rawPayload: payload as Record<string, unknown>,
  };
}
