import { DeliveryChannel, LeadStatus, Prisma } from "@prisma/client";
import { buildLeadDeliveryPayload } from "@/lib/delivery/lead-payload";

/** Synthetic delivery + lead for CRM outbound connection test (no DB write). */
export function buildCrmOutboundTestSourcePayload(partnerId: string, partnerEmail: string) {
  const now = new Date();
  const delivery = {
    id: "00000000-0000-4000-8000-000000000001",
    leadId: "00000000-0000-4000-8000-000000000002",
    partnerId,
    filterSetId: null,
    channel: DeliveryChannel.realtime,
    price: new Prisma.Decimal(25),
    deliveredAt: now,
    refundedAt: null,
    lastDeliveryError: null,
    createdAt: now,
  };

  const lead = {
    id: "00000000-0000-4000-8000-000000000002",
    firstName: "Test",
    lastName: "Lead",
    email: "test.lead@example.com",
    phone: "+15555550100",
    address: "123 Test St",
    city: "Austin",
    state: "TX",
    zip: "78701",
    dob: "1985-01-01",
    age: "41",
    leadType: "high_intent_iul",
    intent: "Life insurance",
    haveIul: "No",
    primaryGoal: "Retirement",
    stateYouCurrentlyLiveIn: "TX",
    trustedformCertUrl: "https://cert.trustedform.com/example",
    trustedformValid: true,
    trustedformCheckedAt: now,
    tcpaConsent: "Yes",
    tcpaLanguage: "English",
    leadidToken: "test-leadid-token",
    source: "crm_outbound_test",
    landingPage: "https://example.com/landing",
    subId: "test-sub",
    pubId: "test-pub",
    boberdooLeadType: null,
    ipAddress: "203.0.113.10",
    userAgent: "FFL-CRM-Outbound-Test/1.0",
    receivedAt: now,
    available: false,
    refundable: true,
    status: LeadStatus.delivered,
    externalId: "TEST-LEAD-001",
    rawPayload: null,
    createdAt: now,
    updatedAt: now,
  };

  const partner = {
    id: partnerId,
    clerkUserId: null,
    email: partnerEmail,
    firstName: "Test",
    lastName: "Partner",
    affiliation: null,
    avatarUrl: null,
    residenceState: "TX",
    filterStates: [],
    priority: 5,
    priceOverride: null,
    walletBalance: new Prisma.Decimal(100),
    status: "active" as const,
    stripeCustomerId: null,
    createdAt: now,
    updatedAt: now,
  };

  return buildLeadDeliveryPayload(delivery, lead, partner);
}
