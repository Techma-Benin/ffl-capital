import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Lead } from "@prisma/client";

import {
  formatStateForIntegrity,
  integrityRealtimeSkipReason,
  isIntegrityRealtimeEligibleState,
} from "../../src/lib/constants/us-states";
import {
  buildIntegrityLeadPayload,
  buildIntegrityPingPayload,
} from "../../src/lib/integrity/build-payload";

function minimalLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead-1",
    externalId: "ext-1",
    firstName: "Mike",
    lastName: "Jones",
    email: "test@example.com",
    phone: "5127891111",
    state: "TX",
    dob: "1980-06-02",
    leadType: "iul",
    address: null,
    city: null,
    zip: null,
    age: null,
    trustedformCertUrl: null,
    leadidToken: null,
    ipAddress: null,
    haveIul: null,
    primaryGoal: null,
    source: null,
    subId: null,
    beneficiary: null,
    historyOfCancer: null,
    mortgageLoanAmount: null,
    status: "unmatched",
    available: true,
    categoryResolution: "matched",
    receivedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    partnerId: null,
    matchedAt: null,
    refundedAt: null,
    refundReason: null,
    refundNotes: null,
    refundAmount: null,
    refundStatus: null,
    stripeChargeId: null,
    stripeRefundId: null,
    boberdooPostedAt: null,
    boberdooLeadId: null,
    boberdooStatus: null,
    boberdooError: null,
    boberdooPayload: null,
    ...overrides,
  } as Lead;
}

describe("Integrity state formatting", () => {
  test("formatStateForIntegrity converts 2-letter codes to full names", () => {
    assert.equal(formatStateForIntegrity("TX"), "Texas");
    assert.equal(formatStateForIntegrity("tx"), "Texas");
    assert.equal(formatStateForIntegrity("CO"), "Colorado");
  });

  test("formatStateForIntegrity passes through full names and unknown values", () => {
    assert.equal(formatStateForIntegrity("Texas"), "Texas");
    assert.equal(formatStateForIntegrity("Unknown"), "Unknown");
  });

  test("buildIntegrityLeadPayload sends full state name, not 2-letter code", () => {
    const payload = buildIntegrityLeadPayload(minimalLead({ state: "TX" }));

    assert.equal(payload.state, "Texas");
    assert.notEqual(payload.state, "TX");
  });

  test("eligible Realtime states are recognized", () => {
    for (const code of ["UT", "MT", "WI", "TX", "OH", "MI", "FL", "AZ"]) {
      assert.equal(isIntegrityRealtimeEligibleState(code), true);
    }
  });

  test("ineligible state CO skips Realtime with explicit reason", () => {
    assert.equal(isIntegrityRealtimeEligibleState("CO"), false);
    assert.equal(
      integrityRealtimeSkipReason("CO"),
      "Integrity Realtime: no campaign for state CO",
    );
  });

  test("buildIntegrityLeadPayload always includes optional fields as empty strings", () => {
    const payload = buildIntegrityLeadPayload(
      minimalLead({
        dob: null,
        address: null,
        city: null,
        zip: null,
      }),
    );

    assert.equal(payload.address_1, "");
    assert.equal(payload.city, "");
    assert.equal(payload.postal_code, "");
    assert.equal(payload.dob_mmddyyyy_thom, "");
    assert.equal(payload.age, "");
    assert.equal(payload.trustedform_cert_url, "");
    assert.equal(payload.universal_leadid, "");
    assert.equal(payload.ip_address, "");
    assert.equal(payload.has_iul_thom, "");
    assert.equal(payload.primary_goal_thom, "");
    assert.equal(payload.campaign_source, "");
    assert.equal(payload.campaign_id, "");
    assert.ok("address_1" in payload);
    assert.ok("city" in payload);
    assert.ok("postal_code" in payload);
  });

  test("buildIntegrityLeadPayload includes MP fields only for mortgage_protection", () => {
    const iulPayload = buildIntegrityLeadPayload(minimalLead({ leadType: "iul" }));
    assert.equal("beneficiary_thom" in iulPayload, false);

    const mpPayload = buildIntegrityLeadPayload(
      minimalLead({
        leadType: "mortgage_protection",
        beneficiary: null,
        historyOfCancer: null,
        mortgageLoanAmount: null,
      }),
    );
    assert.equal(mpPayload.beneficiary_thom, "");
    assert.equal(mpPayload.history_of_cancer_thom, "");
    assert.equal(mpPayload.mortgage_loan_amount_thom, "");
  });

  test("buildIntegrityPingPayload always includes all ping fields", () => {
    const payload = buildIntegrityPingPayload(minimalLead());

    assert.equal(payload.first_name, "Mike");
    assert.equal(payload.last_name, "Jones");
    assert.equal(payload.state, "Texas");
    assert.ok(payload.lead_type_thom.length > 0);
    assert.equal(payload.vendor_lead_id_thom, "ext-1");
  });

  test("formatStateForIntegrity returns empty string for blank state", () => {
    assert.equal(formatStateForIntegrity(""), "");
  });
});
