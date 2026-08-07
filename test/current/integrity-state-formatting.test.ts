import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Lead } from "@prisma/client";

import { formatStateForIntegrity } from "../../src/lib/constants/us-states";
import { buildIntegrityLeadPayload } from "../../src/lib/integrity/build-payload";

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

  test("buildIntegrityLeadPayload always includes address_1 as empty string when missing", () => {
    const payload = buildIntegrityLeadPayload(minimalLead({ address: null }));

    assert.ok("address_1" in payload);
    assert.equal(payload.address_1, "");
  });

  test("buildIntegrityLeadPayload includes both Boberdoo DOB fields when dob is present", () => {
    const payload = buildIntegrityLeadPayload(minimalLead({ dob: "1980-06-02" }));

    assert.equal(payload.dob, "6/2/1980");
    assert.equal(payload.dob_mmddyyyy_thom, "06/02/1980");
  });

  test("buildIntegrityLeadPayload sends empty DOB and IUL fields when null (Boberdoo parity)", () => {
    const payload = buildIntegrityLeadPayload(
      minimalLead({
        dob: null,
        address: null,
        city: null,
        zip: null,
        age: null,
        trustedformCertUrl: null,
        leadidToken: null,
        ipAddress: null,
        haveIul: null,
        primaryGoal: null,
        source: undefined,
        subId: null,
      }),
    );

    assert.ok("address_1" in payload);
    assert.equal(payload.dob, "");
    assert.equal(payload.dob_mmddyyyy_thom, "");
    assert.equal(payload.has_iul_thom, "");
    assert.equal("city" in payload, false);
    assert.equal("postal_code" in payload, false);
    assert.equal("age" in payload, false);
    assert.equal("trustedform_cert_url" in payload, false);
    assert.equal("universal_leadid" in payload, false);
    assert.equal("ip_address" in payload, false);
    assert.equal("primary_goal_thom" in payload, false);
    assert.equal("campaign_source" in payload, false);
    assert.equal("campaign_id" in payload, false);
  });

  test("buildIntegrityLeadPayload includes MP fields only for mortgage_protection", () => {
    const iulPayload = buildIntegrityLeadPayload(minimalLead({ leadType: "iul" }));
    assert.equal("beneficiary_thom" in iulPayload, false);

    const mpPayload = buildIntegrityLeadPayload(
      minimalLead({
        leadType: "mortgage_protection",
        beneficiary: "Spouse",
        historyOfCancer: "No",
        mortgageLoanAmount: "250000",
      }),
    );
    assert.equal(mpPayload.beneficiary_thom, "Spouse");
    assert.equal(mpPayload.history_of_cancer_thom, "No");
    assert.equal(mpPayload["mortgage.loan.amount"], "250000");
  });
});
