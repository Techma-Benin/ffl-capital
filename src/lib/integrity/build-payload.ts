import type { Lead } from "@prisma/client";

export function buildIntegrityLeadPayload(lead: Lead) {
  return {
    leadId: lead.id,
    externalId: lead.externalId,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    address: lead.address,
    city: lead.city,
    state: lead.state,
    zip: lead.zip,
    dob: lead.dob,
    age: lead.age,
    leadType: lead.leadType,
    intent: lead.intent,
    haveIul: lead.haveIul,
    primaryGoal: lead.primaryGoal,
    stateYouCurrentlyLiveIn: lead.stateYouCurrentlyLiveIn,
    trustedformCertUrl: lead.trustedformCertUrl,
    tcpaConsent: lead.tcpaConsent,
    tcpaLanguage: lead.tcpaLanguage,
    leadidToken: lead.leadidToken,
    source: lead.source,
    landingPage: lead.landingPage,
    subId: lead.subId,
    pubId: lead.pubId,
    boberdooLeadType: lead.boberdooLeadType,
    ipAddress: lead.ipAddress,
    userAgent: lead.userAgent,
    receivedAt: lead.receivedAt.toISOString(),
  };
}

export function buildIntegrityPingPayload(lead: Lead) {
  return {
    leadId: lead.id,
    state: lead.state,
    leadType: lead.leadType,
    receivedAt: lead.receivedAt.toISOString(),
  };
}

export function buildIntegrityStorefrontPayload(lead: Lead) {
  return {
    ...buildIntegrityLeadPayload(lead),
    mode: "storefront" as const,
    listingType: "aged",
  };
}
