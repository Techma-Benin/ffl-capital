import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { normalizeLead } from "../../src/lib/intake/normalize-lead";
import { intakePayloadSchema } from "../../src/lib/intake/validate-intake";
import { evaluateLeadCategories } from "../../src/lib/lead-categories/flexible-lead-categories";

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

  test("resolves an exact SRC criterion to the configured internal type", () => {
    const payload = intakePayloadSchema.parse({
      ...requiredBoberdooPayload,
      SRC: "AP-Mortgage-Exclusive",
    });
    const result = evaluateLeadCategories(
      payload as Record<string, unknown>,
      [
        {
          type: "mortgage_protection",
          label: "Mortgage Protection",
          enabled: true,
          criteria: [{ field: "SRC", value: "AP-Mortgage-Exclusive" }],
        },
      ],
    );

    assert.equal(result.outcome, "one");
    assert.equal(result.categoryType, "mortgage_protection");
  });

  test("keeps exact SRC matching case-sensitive", () => {
    const payload = intakePayloadSchema.parse({
      ...requiredBoberdooPayload,
      SRC: "campaign-a",
      Intent: "Traditional",
    });
    const result = evaluateLeadCategories(
      payload as Record<string, unknown>,
      [
        {
          type: "configured_category",
          label: "Configured Category",
          enabled: true,
          criteria: [{ field: "SRC", value: "Campaign-A" }],
        },
      ],
    );

    assert.equal(result.outcome, "zero");
    assert.equal(result.categoryType, null);
  });

  test("does not apply intent or source fallbacks when no category matches", () => {
    const highIntent = evaluateLeadCategories(
      intakePayloadSchema.parse({
        ...requiredBoberdooPayload,
        Intent: "High Intent",
      }) as Record<string, unknown>,
      [],
    );
    const finalExpense = evaluateLeadCategories(
      intakePayloadSchema.parse({
        ...requiredBoberdooPayload,
        SRC: "vendor_finalexpense_campaign",
      }) as Record<string, unknown>,
      [],
    );

    assert.equal(highIntent.outcome, "zero");
    assert.equal(finalExpense.outcome, "zero");
  });
});
