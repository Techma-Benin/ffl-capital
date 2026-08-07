import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  evaluateLifecyclePolicy,
  isPartnerPrimaryRoute,
  DEFAULT_LIFECYCLE_SETTINGS,
} from "../../src/lib/lead-routing/policy";
import { partnerPickerActiveForLead } from "../../src/lib/lead-routing/partner-picker";

describe("Routing mode and partner picker policy", () => {
  test("lifecycle off means partner primary at 0–24h and 24–48h", () => {
    const settings = { ...DEFAULT_LIFECYCLE_SETTINGS, enabled: false };
    for (const ageHours of [1, 30]) {
      const policy = evaluateLifecyclePolicy({
        ageHours,
        liveSold: false,
        integrityPosting: "none",
        integrityBlocked: false,
        settings,
      });
      assert.equal(policy.primaryRoute, "partner");
      assert.equal(isPartnerPrimaryRoute(policy), true);
    }
  });

  test("lifecycle on hides picker during realtime window", () => {
    const settings = { ...DEFAULT_LIFECYCLE_SETTINGS, enabled: true };
    assert.equal(
      partnerPickerActiveForLead({
        ageHours: 5,
        liveSold: false,
        integrityPosting: "none",
        integrityBlocked: false,
        settings,
      }),
      false,
    );
  });

  test("lifecycle on shows picker when partner is mid-window primary", () => {
    const settings = {
      ...DEFAULT_LIFECYCLE_SETTINGS,
      enabled: true,
      midWindowPrimary: "partner" as const,
    };
    assert.equal(
      partnerPickerActiveForLead({
        ageHours: 30,
        liveSold: false,
        integrityPosting: "rejected",
        integrityBlocked: false,
        settings,
      }),
      true,
    );
  });

  test("lifecycle on hides picker when storefront is mid-window primary", () => {
    const settings = {
      ...DEFAULT_LIFECYCLE_SETTINGS,
      enabled: true,
      midWindowPrimary: "storefront" as const,
    };
    assert.equal(
      partnerPickerActiveForLead({
        ageHours: 30,
        liveSold: false,
        integrityPosting: "rejected",
        integrityBlocked: false,
        settings,
      }),
      false,
    );
  });

  test("partners_only window shows picker", () => {
    const settings = { ...DEFAULT_LIFECYCLE_SETTINGS, enabled: true };
    assert.equal(
      partnerPickerActiveForLead({
        ageHours: 60,
        liveSold: false,
        integrityPosting: "rejected",
        integrityBlocked: false,
        settings,
      }),
      true,
    );
  });
});
