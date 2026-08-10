import assert from "node:assert/strict";
import { afterEach, describe, mock, test } from "node:test";
import type { Lead } from "@prisma/client";

import {
  applyIntegrityAutoPostTestFlag,
  buildIntegrityLeadPayload,
  encodeIntegrityFormBody,
} from "../../src/lib/integrity/build-payload";
import {
  checkRequiredIntegrityFields,
  getRequiredIntegrityFields,
} from "../../src/lib/integrity/required-fields";
import { submitToIntegrity } from "../../src/lib/integrity/post";
import { INTEGRITY_LABEL_DEFAULTS_BY_CATEGORY_TYPE } from "../../src/lib/lead-categories/integrity-label-defaults";

const IUL_REALTIME =
  INTEGRITY_LABEL_DEFAULTS_BY_CATEGORY_TYPE.traditional_iul.integrityLabel;

function minimalLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead-1",
    externalId: "ext-1",
    firstName: "Mike",
    lastName: "Jones",
    email: "test@example.com",
    phone: "5127891111",
    state: "TX",
    dob: null,
    leadType: "traditional_iul",
    address: null,
    city: null,
    zip: null,
    age: null,
    trustedformCertUrl: "https://cert.trustedform.com/abc",
    leadidToken: null,
    ipAddress: null,
    haveIul: null,
    primaryGoal: null,
    source: null,
    subId: null,
    beneficiary: null,
    beneficiaryType: null,
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

describe("Boberdoo parity payload shape", () => {
  test("IUL with missing DOB sends empty dob fields and has_iul_thom", () => {
    const payload = buildIntegrityLeadPayload(
      minimalLead({ dob: null, haveIul: null }),
      IUL_REALTIME,
    );

    assert.equal(payload.dob, "");
    assert.equal(payload.dob_mmddyyyy_thom, "");
    assert.equal(payload.has_iul_thom, "");
    assert.equal(payload.address_1, "");
  });

  test("mortgage protection payload omits has_iul_thom", () => {
    const payload = buildIntegrityLeadPayload(
      minimalLead({
        leadType: "mortgage_protection",
        dob: null,
        trustedformCertUrl: "https://cert.trustedform.com/mp-cert",
      }),
      INTEGRITY_LABEL_DEFAULTS_BY_CATEGORY_TYPE.mortgage_protection.integrityLabel,
    );

    assert.equal("has_iul_thom" in payload, false);
    assert.equal(payload.dob_mmddyyyy_thom, "");
  });

  test("encodeIntegrityFormBody preserves blank address_1 and empty DOB fields", () => {
    const payload = buildIntegrityLeadPayload(
      minimalLead({ dob: null }),
      IUL_REALTIME,
    );
    const encoded = encodeIntegrityFormBody(payload);
    const fields = Object.fromEntries(new URLSearchParams(encoded).entries());

    assert.equal(fields.address_1, "");
    assert.equal(fields.dob, "");
    assert.equal(fields.dob_mmddyyyy_thom, "");
    assert.equal(fields.has_iul_thom, "");
  });
});

describe("Required fields are advisory only", () => {
  test("missing DOB is flagged for admin UI but does not imply HTTP block", () => {
    const check = checkRequiredIntegrityFields(
      {
        leadType: "traditional_iul",
        dob: null,
        trustedformCertUrl: "https://cert.trustedform.com/abc",
        haveIul: "yes",
        primaryGoal: "Stability",
        beneficiary: null,
        beneficiaryType: null,
        historyOfCancer: null,
        mortgageLoanAmount: null,
      },
      "realtime",
    );
    assert.equal(check.ok, false);
    assert.deepEqual(check.missing, ["DOB"]);
  });

  test("storefront mortgage protection does not require Have_IUL", () => {
    const fields = getRequiredIntegrityFields({
      mode: "storefront",
      leadType: "mortgage_protection",
    });
    const labels = fields.map((f) => f.label);
    assert.ok(!labels.includes("Have_IUL"));
  });
});

describe("Auto post with missing DOB still performs HTTP", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test("submitToIntegrity is called for mock auto payload missing DOB", async () => {
    const payload = applyIntegrityAutoPostTestFlag(
      buildIntegrityLeadPayload(minimalLead({ dob: null }), IUL_REALTIME),
      "mock",
    );
    assert.equal(payload.is_test, "yes");
    assert.equal(payload.dob_mmddyyyy_thom, "");

    let fetchCalls = 0;
    mock.method(globalThis, "fetch", async () => {
      fetchCalls += 1;
      return new Response(
        JSON.stringify({
          outcome: "failure",
          reason: "Missing required field: dob_mmddyyyy_thom",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const result = await submitToIntegrity(
      "https://app.leadconduit.com/flows/test/submit",
      payload,
      { leadId: "lead-1", integrationsMode: "mock", isTest: true },
    );

    assert.equal(fetchCalls, 1);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.reason, /dob_mmddyyyy_thom|Rejected|failure/i);
      assert.ok(result.response);
    }
  });
});

describe("Admin test route HTTP in mock mode", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test("mock integrations mode still POSTs with is_test=yes", async () => {
    const testFields = {
      first_name: "Mike",
      last_name: "Jones",
      email: "test@example.com",
      lead_type_thom: IUL_REALTIME,
      is_test: "yes",
      address_1: "",
    };
    const encodedBody = encodeIntegrityFormBody(testFields);

    let fetchCalls = 0;
    let capturedBody: string | undefined;

    mock.method(globalThis, "fetch", async (_input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls += 1;
      capturedBody = String(init?.body ?? "");
      return new Response(
        JSON.stringify({ outcome: "success", lead: { id: "lc-admin-test" } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const res = await fetch("https://app.leadconduit.com/flows/test/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: encodedBody,
    });
    const rawResponse = await res.json();

    assert.equal(fetchCalls, 1);
    assert.equal((rawResponse as { outcome: string }).outcome, "success");

    const fields = Object.fromEntries(new URLSearchParams(capturedBody).entries());
    assert.equal(fields.is_test, "yes");
    assert.equal(fields.address_1, "");
  });
});
