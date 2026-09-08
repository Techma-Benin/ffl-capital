import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Lead, LeadDelivery, Partner } from "@prisma/client";

import { buildCrmOutboundFailureEmail } from "../../src/lib/delivery/crm-outbound-failure-email";
import {
  buildLeadDeliveryEmailHtml,
  buildLeadDeliveryPayload,
} from "../../src/lib/delivery/lead-payload";

function minimalLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead_1",
    externalId: "ext_1",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: "555-0100",
    address: "123 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
    dob: "1980-06-02",
    age: "45",
    leadType: "final_expense",
    categoryResolution: null,
    categoryCandidateTypes: [],
    intent: "quote",
    haveIul: "no",
    primaryGoal: "coverage",
    stateYouCurrentlyLiveIn: "TX",
    trustedformCertUrl: "https://cert.trustedform.com/abc",
    tcpaConsent: "yes",
    tcpaLanguage: "I agree",
    leadidToken: "token_1",
    source: "facebook",
    landingPage: "https://example.com/lp",
    subId: "sub_1",
    pubId: "pub_1",
    boberdooLeadType: "FE",
    ipAddress: "203.0.113.10",
    userAgent: "Mozilla/5.0",
    receivedAt: new Date("2026-08-01T12:00:00.000Z"),
    ...overrides,
  } as Lead;
}

function minimalDelivery(overrides: Partial<LeadDelivery> = {}): LeadDelivery {
  return {
    id: "delivery_1",
    channel: "exclusive",
    price: 25,
    deliveredAt: new Date("2026-08-01T12:05:00.000Z"),
    ...overrides,
  } as LeadDelivery;
}

function minimalPartner(overrides: Partial<Partner> = {}): Partner {
  return {
    id: "partner_1",
    email: "partner@example.com",
    firstName: "Ada",
    lastName: "Lovelace",
    ...overrides,
  } as Partner;
}

describe("buildLeadDeliveryEmailHtml", () => {
  test("uses professional greeting and one row per field", () => {
    const html = buildLeadDeliveryEmailHtml(
      minimalDelivery(),
      minimalLead(),
      minimalPartner(),
      [],
      { appOrigin: "https://app.example.com" },
    );

    assert.match(html, /Hello Ada/);
    assert.match(html, /We have delivered a new lead/);
    assert.match(html, /\bName\b/);
    assert.match(html, /\bPhone\b/);
    assert.match(html, /\bEmail\b/);
    assert.match(html, /\bDOB\b/);
    assert.match(html, /\bAge\b/);
    assert.doesNotMatch(html, /DOB\/Age|DOB \/ Age/i);
    assert.match(html, /1980-06-02/);
    assert.match(html, /\b45\b/);
    assert.match(html, /Open in portal/);
    assert.match(html, /https:\/\/app\.example\.com\/partner\/leads\/delivery_1/);
    assert.match(html, /#0B3D91/);
    assert.match(html, /\bDelivered\b/);
    assert.doesNotMatch(html, />Received</);
    assert.doesNotMatch(html, /2026-08-01T12:00:00/);
  });

  test("omits platform receivedAt from partner delivery payload", () => {
    const payload = buildLeadDeliveryPayload(
      minimalDelivery(),
      minimalLead(),
      minimalPartner(),
    );
    assert.equal("receivedAt" in payload, false);
    assert.ok(payload.deliveredAt);
  });
});

describe("buildCrmOutboundFailureEmail", () => {
  test("includes greeting, facts, reason, and CRM settings CTA", () => {
    const email = buildCrmOutboundFailureEmail({
      partnerFirstName: "Ada",
      leadId: "lead_1",
      deliveryId: "delivery_1",
      endpointUrl: "https://crm.example.com/hooks/leads",
      statusCode: 502,
      errorMessage: "Bad Gateway",
      appOrigin: "https://app.example.com",
    });

    assert.equal(email.subject, "CRM delivery failed");
    assert.match(email.html, /Hello Ada/);
    assert.match(email.html, /unable to deliver a lead to your CRM/i);
    assert.match(email.html, /lead_1/);
    assert.match(email.html, /delivery_1/);
    assert.match(email.html, /crm\.example\.com/);
    assert.match(email.html, /502/);
    assert.match(email.html, /Bad Gateway/);
    assert.match(email.html, /Open CRM settings/);
    assert.match(
      email.html,
      /https:\/\/app\.example\.com\/partner\/settings\/crm-outbound/,
    );
    assert.match(email.html, /not included in this notice for security/i);
  });

  test("ignores loopback crmSettingsUrl override when public URL is set", () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    try {
      const email = buildCrmOutboundFailureEmail({
        partnerFirstName: "Ada",
        leadId: "lead_1",
        deliveryId: "delivery_1",
        endpointUrl: "https://crm.example.com/hooks/leads",
        errorMessage: "timeout",
        crmSettingsUrl: "https://localhost:5000/partner/settings/crm-outbound",
      });
      assert.match(
        email.html,
        /https:\/\/app\.example\.com\/partner\/settings\/crm-outbound/,
      );
      assert.doesNotMatch(email.html, /localhost:5000/);
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = previous;
    }
  });
});
