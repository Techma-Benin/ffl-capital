import assert from "node:assert/strict";
import { describe, test } from "node:test";

type Category = {
  type: string;
  label: string;
  enabled: boolean;
  criteria: Array<{ field: string; value: string }>;
};

type Classification = {
  leadType: string | null;
  categoryResolution: "matched" | "no_match" | "multiple_matches";
  categoryCandidateTypes: string[];
  status: "unmatched" | "review";
  available: boolean;
};

type ImportClassificationFeature = {
  classifyImportedLead(
    payload: Record<string, unknown>,
    categories: Category[],
  ): Classification;
};

const featureModule =
  "../../src/lib/migration/import-category-classification";

async function loadFeature(): Promise<ImportClassificationFeature> {
  try {
    return (await import(featureModule)) as ImportClassificationFeature;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Cannot find module") ||
        error.message.includes("ERR_MODULE_NOT_FOUND"))
    ) {
      assert.fail(
        "Import category classification is not implemented: expected " +
          "src/lib/migration/import-category-classification.ts",
      );
    }
    throw error;
  }
}

const categories: Category[] = [
  {
    type: "traditional_iul",
    label: "Traditional IUL",
    enabled: true,
    criteria: [
      { field: "SRC", value: "IUL_LeadConduit" },
      { field: "Intent", value: "Standard" },
    ],
  },
  {
    type: "veteran",
    label: "Veteran Leads",
    enabled: true,
    criteria: [{ field: "SRC", value: "Veteran_LeadConduit" }],
  },
];

describe("planned import and historical category classification", () => {
  test("uses the category table instead of the legacy IUL fallback", async () => {
    const feature = await loadFeature();

    const result = feature.classifyImportedLead(
      { SRC: "Veteran_LeadConduit" },
      categories,
    );

    assert.deepEqual(result, {
      leadType: "veteran",
      categoryResolution: "matched",
      categoryCandidateTypes: ["veteran"],
      status: "unmatched",
      available: true,
    });
  });

  test("does not classify an unknown source as Traditional or High Intent IUL", async () => {
    const feature = await loadFeature();

    const result = feature.classifyImportedLead(
      { SRC: "ModGate_Unknown", Intent: "High Intent" },
      categories,
    );

    assert.deepEqual(result, {
      leadType: null,
      categoryResolution: "no_match",
      categoryCandidateTypes: [],
      status: "review",
      available: false,
    });
  });

  test("requires every criterion before assigning an IUL category", async () => {
    const feature = await loadFeature();

    const result = feature.classifyImportedLead(
      { SRC: "IUL_LeadConduit" },
      categories,
    );

    assert.equal(result.leadType, null);
    assert.equal(result.categoryResolution, "no_match");
    assert.equal(result.status, "review");
  });
});
