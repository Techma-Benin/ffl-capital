import assert from "node:assert/strict";
import { describe, test } from "node:test";

type LeadState = {
  available: boolean;
  status: string;
  categoryResolution: "matched" | "no_match" | "multiple_matches";
  leadType: string | null;
};

type Eligibility = {
  eligible: boolean;
  reason?: string;
};

type ReprocessEligibilityFeature = {
  getReprocessEligibility(lead: LeadState): Eligibility;
};

const featureModule =
  "../../src/lib/jobs/reprocess-eligibility";

async function loadFeature(): Promise<ReprocessEligibilityFeature> {
  try {
    return (await import(featureModule)) as ReprocessEligibilityFeature;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Cannot find module") ||
        error.message.includes("ERR_MODULE_NOT_FOUND"))
    ) {
      assert.fail(
        "Reprocess eligibility is not extracted: expected " +
          "src/lib/jobs/reprocess-eligibility.ts",
      );
    }
    throw error;
  }
}

describe("planned category reprocess guardrails", () => {
  test("blocks unclassified and multiple-match review leads", async () => {
    const feature = await loadFeature();

    for (const categoryResolution of [
      "no_match",
      "multiple_matches",
    ] as const) {
      const result = feature.getReprocessEligibility({
        available: false,
        status: "review",
        categoryResolution,
        leadType: null,
      });

      assert.equal(result.eligible, false);
      assert.match(result.reason ?? "", /category|review|unresolved/i);
    }
  });

  test("allows a manually categorized unmatched lead", async () => {
    const feature = await loadFeature();

    const result = feature.getReprocessEligibility({
      available: true,
      status: "unmatched",
      categoryResolution: "matched",
      leadType: "veteran",
    });

    assert.deepEqual(result, { eligible: true });
  });

  test("still blocks unavailable, delivered, and typeless leads", async () => {
    const feature = await loadFeature();

    const blocked: LeadState[] = [
      {
        available: false,
        status: "unmatched",
        categoryResolution: "matched",
        leadType: "veteran",
      },
      {
        available: true,
        status: "delivered",
        categoryResolution: "matched",
        leadType: "veteran",
      },
      {
        available: true,
        status: "unmatched",
        categoryResolution: "matched",
        leadType: null,
      },
    ];

    for (const lead of blocked) {
      assert.equal(feature.getReprocessEligibility(lead).eligible, false);
    }
  });
});
