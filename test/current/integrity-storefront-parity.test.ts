import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Lead } from "@prisma/client";

import {
  buildIntegrityLeadPayload,
  buildIntegrityStorefrontPayload,
  encodeIntegrityFormBody,
  resolveIntegrityLabel,
  resolveIntegrityLabelForMode,
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
    trustedformCertUrl: "https://cert.trustedform.com/abc",
    leadidToken: "jornaya-token",
    ipAddress: null,
    haveIul: "yes",
    primaryGoal: "Stability",
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

describe("Integrity Realtime vs Storefront label resolution", () => {
  test("resolveIntegrityLabel uses Realtime label or default", () => {
    assert.equal(
      resolveIntegrityLabel("Final Expense Facebook (Realtime Lead)"),
      "Final Expense Facebook (Realtime Lead)",
    );
    assert.equal(
      resolveIntegrityLabel("  "),
      "Indexed Universal Life [IUL] Facebook (Realtime Lead)",
    );
    assert.equal(
      resolveIntegrityLabel(null),
      "Indexed Universal Life [IUL] Facebook (Realtime Lead)",
    );
  });

  test("blank Storefront label falls back to Realtime label", () => {
    assert.equal(
      resolveIntegrityLabelForMode("storefront", {
        realtime: "Indexed Universal Life [IUL] Facebook (Realtime Lead)",
        storefront: null,
      }),
      "Indexed Universal Life [IUL] Facebook (Realtime Lead)",
    );
    assert.equal(
      resolveIntegrityLabelForMode("storefront", {
        realtime: "Indexed Universal Life [IUL] Facebook (Realtime Lead)",
        storefront: "   ",
      }),
      "Indexed Universal Life [IUL] Facebook (Realtime Lead)",
    );
  });

  test("Storefront label wins when set", () => {
    assert.equal(
      resolveIntegrityLabelForMode("storefront", {
        realtime: "Realtime Label",
        storefront: "Storefront Label",
      }),
      "Storefront Label",
    );
  });

  test("Realtime mode ignores Storefront label", () => {
    assert.equal(
      resolveIntegrityLabelForMode("realtime", {
        realtime: "Realtime Label",
        storefront: "Storefront Label",
      }),
      "Realtime Label",
    );
  });

  test("buildIntegrityStorefrontPayload applies Storefront label", () => {
    const payload = buildIntegrityStorefrontPayload(minimalLead(), "Realtime Label", {
      realtime: "Realtime Label",
      storefront: "Storefront Label",
    });
    assert.equal(payload.lead_type_thom, "Storefront Label");
  });
});

describe("Integrity Storefront IUL payload parity", () => {
  test("includes blank address_1, both DOB fields, TrustedForm, Jornaya, IUL, goal", () => {
    const payload = buildIntegrityStorefrontPayload(
      minimalLead({ address: null }),
      null,
      { realtime: null, storefront: null },
    );

    assert.equal(payload.address_1, "");
    assert.equal(payload.dob, "6/2/1980");
    assert.equal(payload.dob_mmddyyyy_thom, "06/02/1980");
    assert.equal(
      payload.trustedform_cert_url,
      "https://cert.trustedform.com/abc",
    );
    assert.equal(payload.universal_leadid, "jornaya-token");
    assert.equal(payload.has_iul_thom, "yes");
    assert.equal(payload.primary_goal_thom, "Stability");
  });

  test("encodeIntegrityFormBody preserves blank address_1", () => {
    const payload = buildIntegrityLeadPayload(minimalLead({ address: null }));
    const encoded = encodeIntegrityFormBody(payload);
    const fields = Object.fromEntries(new URLSearchParams(encoded).entries());

    assert.ok("address_1" in fields);
    assert.equal(fields.address_1, "");
    assert.match(encoded, /(?:^|&)address_1=(?:&|$)/);
  });

  test("encoded body keeps DOB fields and lead_type_thom", () => {
    const payload = buildIntegrityStorefrontPayload(minimalLead(), null, {
      realtime: "Realtime Label",
      storefront: "",
    });
    const encoded = encodeIntegrityFormBody({ ...payload, is_test: "yes" });
    const fields = Object.fromEntries(new URLSearchParams(encoded).entries());

    assert.equal(fields.dob, "6/2/1980");
    assert.equal(fields.dob_mmddyyyy_thom, "06/02/1980");
    assert.equal(fields.lead_type_thom, "Realtime Label");
    assert.equal(fields.is_test, "yes");
    assert.equal(fields.address_1, "");
  });
});
