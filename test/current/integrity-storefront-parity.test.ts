import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Lead } from "@prisma/client";

import {
  buildIntegrityLeadPayload,
  buildIntegrityStorefrontPayload,
  buildLeadTypeThomOptions,
  encodeIntegrityFormBody,
  resolveIntegrityLabel,
  resolveIntegrityLabelForMode,
} from "../../src/lib/integrity/build-payload";
import { INTEGRITY_LABEL_DEFAULTS_BY_CATEGORY_TYPE } from "../../src/lib/lead-categories/integrity-label-defaults";

const IUL_REALTIME =
  INTEGRITY_LABEL_DEFAULTS_BY_CATEGORY_TYPE.traditional_iul.integrityLabel;
const IUL_STOREFRONT =
  INTEGRITY_LABEL_DEFAULTS_BY_CATEGORY_TYPE.traditional_iul.integrityLabelStorefront;

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
    leadType: "traditional_iul",
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

describe("Integrity Realtime vs Storefront label resolution", () => {
  test("resolveIntegrityLabel returns category Realtime label only", () => {
    assert.equal(
      resolveIntegrityLabel("Final Expense Facebook (Realtime Lead)"),
      "Final Expense Facebook (Realtime Lead)",
    );
    assert.equal(resolveIntegrityLabel("  "), undefined);
    assert.equal(resolveIntegrityLabel(null), undefined);
  });

  test("blank Storefront label falls back to Realtime on the same category", () => {
    assert.equal(
      resolveIntegrityLabelForMode("storefront", {
        realtime: IUL_REALTIME,
        storefront: null,
      }),
      IUL_REALTIME,
    );
    assert.equal(
      resolveIntegrityLabelForMode("storefront", {
        realtime: IUL_REALTIME,
        storefront: "   ",
      }),
      IUL_REALTIME,
    );
  });

  test("Storefront label wins when set on category", () => {
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

  test("buildLeadTypeThomOptions lists only labels from the matched category", () => {
    const options = buildLeadTypeThomOptions(
      "storefront",
      [
        {
          integrityLabel: "Realtime Only",
          integrityLabelStorefront: "Custom Storefront Label",
        },
        {
          integrityLabel: "Other Realtime",
          integrityLabelStorefront: "Other Storefront",
        },
      ],
      {
        integrityLabel: "Realtime Only",
        integrityLabelStorefront: "Custom Storefront Label",
      },
    );

    assert.deepEqual(options, ["Custom Storefront Label", "Realtime Only"]);
  });

  test("buildIntegrityStorefrontPayload applies Storefront label from category", () => {
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
      IUL_REALTIME,
      {
        realtime: IUL_REALTIME,
        storefront: IUL_STOREFRONT,
      },
    );

    assert.equal(payload.lead_type_thom, IUL_STOREFRONT);
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
    const payload = buildIntegrityLeadPayload(minimalLead({ address: null }), IUL_REALTIME);
    const encoded = encodeIntegrityFormBody(payload);
    const fields = Object.fromEntries(new URLSearchParams(encoded).entries());

    assert.ok("address_1" in fields);
    assert.equal(fields.address_1, "");
    assert.match(encoded, /(?:^|&)address_1=(?:&|$)/);
  });

  test("encoded body keeps DOB fields and category Storefront lead_type_thom", () => {
    const payload = buildIntegrityStorefrontPayload(
      minimalLead({ leadType: "traditional_iul" }),
      IUL_REALTIME,
      { realtime: IUL_REALTIME, storefront: IUL_STOREFRONT },
    );
    const encoded = encodeIntegrityFormBody({ ...payload, is_test: "yes" });
    const fields = Object.fromEntries(new URLSearchParams(encoded).entries());

    assert.equal(fields.dob, "6/2/1980");
    assert.equal(fields.dob_mmddyyyy_thom, "06/02/1980");
    assert.equal(fields.lead_type_thom, IUL_STOREFRONT);
    assert.equal(fields.is_test, "yes");
    assert.equal(fields.address_1, "");
  });
});
