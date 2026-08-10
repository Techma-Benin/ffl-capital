import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { evaluateLifecyclePolicy } from "../../src/lib/lead-routing/policy";
import { DEFAULT_LIFECYCLE_SETTINGS } from "../../src/lib/lead-routing/policy";
import {
  buildRealtimeIulPingPayload,
  extractTrustedFormCertId,
} from "../../src/lib/integrity/build-payload";
import { isRealtimeIulLeadType } from "../../src/lib/integrity/azure-ping";
import { redactSecrets } from "../../src/lib/integrity/redact-secrets";
import {
  checkRequiredIntegrityFields,
  getRequiredIntegrityFields,
} from "../../src/lib/integrity/required-fields";

const settings = { ...DEFAULT_LIFECYCLE_SETTINGS, enabled: true };

describe("Phase 2 lifecycle policy boundaries", () => {
  test("0–24h routes Realtime only", () => {
    for (const ageHours of [0, 23.99]) {
      const result = evaluateLifecyclePolicy({
        ageHours,
        liveSold: false,
        integrityPosting: "rejected",
        integrityBlocked: false,
        settings,
      });
      assert.equal(result.phase, "realtime");
      assert.equal(result.primaryRoute, "integrity_realtime");
      assert.equal(result.fallbackRoute, null);
    }
  });

  test("24–48h uses configured primary and fallback", () => {
    for (const ageHours of [24, 47.99]) {
      const result = evaluateLifecyclePolicy({
        ageHours,
        liveSold: false,
        integrityPosting: "rejected",
        integrityBlocked: false,
        settings,
      });
      assert.equal(result.phase, "partner_or_storefront");
      assert.equal(result.primaryRoute, "partner");
      assert.equal(result.fallbackRoute, "integrity_storefront");
    }
  });

  test("pending Integrity posting blocks mid-window fallback", () => {
    const result = evaluateLifecyclePolicy({
      ageHours: 30,
      liveSold: false,
      integrityPosting: "pending",
      integrityBlocked: false,
      settings,
    });
    assert.equal(result.phase, "waiting");
    assert.equal(result.primaryRoute, null);
    assert.match(result.reason ?? "", /pending/i);
  });

  test("48h–30d is partners only", () => {
    for (const ageHours of [48, 24 * 29.99]) {
      const result = evaluateLifecyclePolicy({
        ageHours,
        liveSold: false,
        integrityPosting: "rejected",
        integrityBlocked: false,
        settings,
      });
      assert.equal(result.phase, "partners_only");
      assert.equal(result.primaryRoute, "partner");
      assert.equal(result.fallbackRoute, null);
    }
  });

  test("day 30 enters aged marketplace", () => {
    const result = evaluateLifecyclePolicy({
      ageHours: 24 * 30,
      liveSold: false,
      integrityPosting: "rejected",
      integrityBlocked: false,
      settings,
    });
    assert.equal(result.phase, "aged_marketplace");
    assert.equal(result.primaryRoute, "aged_marketplace");
  });

  test("live sale stops automatic live routing before day 30", () => {
    const result = evaluateLifecyclePolicy({
      ageHours: 30,
      liveSold: true,
      integrityPosting: "sold",
      integrityBlocked: false,
      settings,
    });
    assert.equal(result.phase, "live_sold");
    assert.equal(result.primaryRoute, null);
  });

  test("live-sold leads still become aged-eligible at day 30", () => {
    const result = evaluateLifecyclePolicy({
      ageHours: 24 * 30,
      liveSold: true,
      integrityPosting: "sold",
      integrityBlocked: false,
      settings,
    });
    assert.equal(result.phase, "aged_marketplace");
    assert.equal(result.primaryRoute, "aged_marketplace");
  });

  test("lifecycle off is Partner-only with no Integrity routes", () => {
    const off = { ...DEFAULT_LIFECYCLE_SETTINGS, enabled: false };
    for (const ageHours of [1, 30, 60]) {
      const result = evaluateLifecyclePolicy({
        ageHours,
        liveSold: false,
        integrityPosting: "none",
        integrityBlocked: false,
        settings: off,
      });
      assert.equal(result.phase, "partner_only_mode");
      assert.equal(result.primaryRoute, "partner");
      assert.equal(result.fallbackRoute, null);
    }
  });

  test("Integrity-blocked realtime waits for partner window", () => {
    const result = evaluateLifecyclePolicy({
      ageHours: 12,
      liveSold: false,
      integrityPosting: "rejected",
      integrityBlocked: true,
      settings,
    });
    assert.equal(result.phase, "waiting");
    assert.equal(result.primaryRoute, null);
  });

  test("Integrity-blocked mid-window is partner only", () => {
    const result = evaluateLifecyclePolicy({
      ageHours: 30,
      liveSold: false,
      integrityPosting: "rejected",
      integrityBlocked: true,
      settings,
    });
    assert.equal(result.phase, "partner_or_storefront");
    assert.equal(result.primaryRoute, "partner");
    assert.equal(result.fallbackRoute, null);
  });
});

describe("Realtime IUL ping eligibility and payload", () => {
  test("only IUL lead types are ping-eligible", () => {
    assert.equal(isRealtimeIulLeadType("traditional_iul"), true);
    assert.equal(isRealtimeIulLeadType("high_intent_iul"), true);
    assert.equal(isRealtimeIulLeadType("mortgage_protection"), false);
  });

  test("ping payload uses state, postal_code, and lead_type_thom", () => {
    const payload = buildRealtimeIulPingPayload(
      {
        state: "TX",
        zip: "78701",
      } as never,
      "Indexed Universal Life [IUL] Facebook (Realtime Lead)",
    );
    assert.deepEqual(payload, {
      state: "Texas",
      postal_code: "78701",
      lead_type_thom: "Indexed Universal Life [IUL] Facebook (Realtime Lead)",
    });
  });
});

describe("Mode/product required fields", () => {
  test("storefront mortgage protection does not require IUL-only fields", () => {
    const fields = getRequiredIntegrityFields({
      mode: "storefront",
      leadType: "mortgage_protection",
    });
    const labels = fields.map((f) => f.label);
    assert.ok(!labels.includes("Have_IUL"));
    assert.ok(!labels.includes("Beneficiary"));
    assert.ok(labels.includes("Beneficiary Type"));
    assert.ok(labels.includes("Mortgage Loan Amount"));
  });

  test("realtime IUL enforces IUL-specific fields", () => {
    const check = checkRequiredIntegrityFields(
      {
        leadType: "traditional_iul",
        dob: "1980-01-01",
        trustedformCertUrl: "https://cert.trustedform.com/abc",
        haveIul: null,
        primaryGoal: "Stability",
        beneficiary: null,
        beneficiaryType: null,
        historyOfCancer: null,
        mortgageLoanAmount: null,
      },
      "realtime",
    );
    assert.equal(check.ok, false);
    assert.deepEqual(check.missing, ["Have_IUL"]);
  });
});

describe("Secret redaction", () => {
  test("redacts secret-like keys from nested objects", () => {
    const redacted = redactSecrets({
      headers: {
        VendorId: "1086",
        "x-functions-key": "super-secret-key-value",
      },
    }) as { headers: Record<string, string> };
    assert.equal(redacted.headers["x-functions-key"], "[REDACTED]");
    assert.equal(redacted.headers.VendorId, "1086");
  });
});

describe("TrustedForm cert id extraction", () => {
  test("uses certificate basename for mortgage vendor lead id", () => {
    assert.equal(
      extractTrustedFormCertId(
        "https://cert.trustedform.com/a1028cbb41b876744fa752eec276bec0e4c48b33",
      ),
      "a1028cbb41b876744fa752eec276bec0e4c48b33",
    );
  });
});
