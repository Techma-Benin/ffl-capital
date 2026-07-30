import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { normalizeLead } from "../../src/lib/intake/normalize-lead";
import { intakePayloadSchema } from "../../src/lib/intake/validate-intake";

const requiredBoberdooPayload = {
  First_Name: "Ada",
  Last_Name: "Lovelace",
  Email: "ada@example.com",
  Primary_Phone: "5551112222",
  State: "ny",
  DOB: "1815-12-10",
  Trusted_Form_URL: "https://cert.trustedform.com/example",
};

describe("current lead intake validation", () => {
  test("accepts the LeadConduit/Boberdoo contact field names", () => {
    const result = intakePayloadSchema.safeParse(requiredBoberdooPayload);

    assert.equal(result.success, true);
  });

  test("accepts camelCase simulator contact aliases", () => {
    const result = intakePayloadSchema.safeParse({
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
      phone: "5553334444",
      state: "va",
      dob: "1906-12-09",
      trustedformCertUrl: "https://cert.trustedform.com/example",
    });

    assert.equal(result.success, true);
  });

  test("rejects intake missing a required contact field", () => {
    const { Primary_Phone: _phone, ...payload } = requiredBoberdooPayload;
    const result = intakePayloadSchema.safeParse(payload);

    assert.equal(result.success, false);
    assert.match(
      result.error.issues.map((issue) => issue.message).join("; "),
      /Missing required fields: firstName, lastName, email, phone, state/,
    );
  });

  test("preserves additional top-level ActiveProspect fields", () => {
    const result = intakePayloadSchema.parse({
      ...requiredBoberdooPayload,
      Campaign_Name: "Veterans 2026",
    });

    assert.equal(result.Campaign_Name, "Veterans 2026");
  });
});

describe("current lead normalization and category mapping", () => {
  test("normalizes contact aliases and uppercases state", () => {
    const normalized = normalizeLead(
      intakePayloadSchema.parse(requiredBoberdooPayload),
    );

    assert.deepEqual(
      {
        firstName: normalized.firstName,
        lastName: normalized.lastName,
        email: normalized.email,
        phone: normalized.phone,
        state: normalized.state,
      },
      {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "5551112222",
        state: "NY",
      },
    );
  });

  test("retains the original payload for downstream integrations", () => {
    const payload = intakePayloadSchema.parse({
      ...requiredBoberdooPayload,
      Campaign_Name: "Veterans 2026",
    });

    assert.deepEqual(normalizeLead(payload).rawPayload, payload);
  });

  test("maps an exact SRC value to the configured internal type", () => {
    const normalized = normalizeLead(
      intakePayloadSchema.parse({
        ...requiredBoberdooPayload,
        SRC: "AP-Mortgage-Exclusive",
      }),
      [{ type: "mortgage_protection", src: "AP-Mortgage-Exclusive" }],
    );

    assert.equal(normalized.leadType, "mortgage_protection");
  });

  test("keeps current exact SRC matching case-sensitive", () => {
    const normalized = normalizeLead(
      intakePayloadSchema.parse({
        ...requiredBoberdooPayload,
        SRC: "campaign-a",
        Intent: "Traditional",
      }),
      [{ type: "configured_category", src: "Campaign-A" }],
    );

    assert.equal(normalized.leadType, "traditional_iul");
  });

  test("retains current intent and source fallbacks when SRC is not configured", () => {
    const highIntent = normalizeLead(
      intakePayloadSchema.parse({
        ...requiredBoberdooPayload,
        Intent: "High Intent",
      }),
    );
    const finalExpense = normalizeLead(
      intakePayloadSchema.parse({
        ...requiredBoberdooPayload,
        SRC: "vendor_finalexpense_campaign",
      }),
    );

    assert.equal(highIntent.leadType, "high_intent_iul");
    assert.equal(finalExpense.leadType, "final_expense");
  });
});
