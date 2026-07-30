import assert from "node:assert/strict";
import { describe, test } from "node:test";

type ReviewLead = {
  status: string;
  available: boolean;
  categoryResolution: "matched" | "no_match" | "multiple_matches";
  categoryCandidateTypes: string[];
  leadType: string | null;
  rawPayload: Record<string, unknown>;
};

type Category = {
  type: string;
  label: string;
  enabled: boolean;
  criteria: Array<{ field: string; value: string }>;
};

type AssignmentResult = {
  update: {
    leadType: string;
    categoryResolution: "matched";
    categoryCandidateTypes: string[];
    status: "unmatched";
    available: true;
    rawPayload: Record<string, unknown>;
    source?: string;
    intent?: string | null;
  };
  overwrittenCriteria: Array<{
    field: string;
    previousValue: unknown;
    nextValue: string;
  }>;
  requiresReprocess: true;
};

type ManualAssignmentFeature = {
  prepareManualCategoryAssignment(input: {
    lead: ReviewLead;
    category: Category;
  }): AssignmentResult;
};

const featureModule =
  "../../src/lib/lead-categories/manual-category-assignment";

async function loadFeature(): Promise<ManualAssignmentFeature> {
  try {
    return (await import(featureModule)) as ManualAssignmentFeature;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Cannot find module") ||
        error.message.includes("ERR_MODULE_NOT_FOUND"))
    ) {
      assert.fail(
        "Manual category assignment is not implemented: expected " +
          "src/lib/lead-categories/manual-category-assignment.ts",
      );
    }
    throw error;
  }
}

const unclassifiedLead: ReviewLead = {
  status: "review",
  available: false,
  categoryResolution: "no_match",
  categoryCandidateTypes: [],
  leadType: null,
  rawPayload: {
    First_Name: "Ada",
    Last_Name: "Lovelace",
    Email: "ada@example.com",
    Primary_Phone: "5551112222",
    State: "NY",
    SRC: "IUL_LeadConduit",
  },
};

const traditionalIul: Category = {
  type: "traditional_iul",
  label: "Traditional IUL",
  enabled: true,
  criteria: [
    { field: "SRC", value: "IUL_LeadConduit" },
    { field: "Intent", value: "Standard" },
  ],
};

describe("planned manual category assignment", () => {
  test("turns an unclassified review lead into an unmatched categorized lead", async () => {
    const feature = await loadFeature();

    const result = feature.prepareManualCategoryAssignment({
      lead: unclassifiedLead,
      category: traditionalIul,
    });

    assert.deepEqual(
      {
        leadType: result.update.leadType,
        categoryResolution: result.update.categoryResolution,
        categoryCandidateTypes: result.update.categoryCandidateTypes,
        status: result.update.status,
        available: result.update.available,
        requiresReprocess: result.requiresReprocess,
      },
      {
        leadType: "traditional_iul",
        categoryResolution: "matched",
        categoryCandidateTypes: ["traditional_iul"],
        status: "unmatched",
        available: true,
        requiresReprocess: true,
      },
    );
  });

  test("writes category criteria into raw payload and reuses intake normalization", async () => {
    const feature = await loadFeature();

    const result = feature.prepareManualCategoryAssignment({
      lead: {
        ...unclassifiedLead,
        rawPayload: {
          ...unclassifiedLead.rawPayload,
          SRC: "wrong_source",
          Intent: "High Intent",
        },
      },
      category: traditionalIul,
    });

    assert.equal(result.update.rawPayload.SRC, "IUL_LeadConduit");
    assert.equal(result.update.rawPayload.Intent, "Standard");
    assert.equal(result.update.source, "IUL_LeadConduit");
    assert.equal(result.update.intent, "Standard");
    assert.deepEqual(result.overwrittenCriteria, [
      {
        field: "SRC",
        previousValue: "wrong_source",
        nextValue: "IUL_LeadConduit",
      },
      {
        field: "Intent",
        previousValue: "High Intent",
        nextValue: "Standard",
      },
    ]);
  });

  test("allows an admin to resolve a multiple-match review lead", async () => {
    const feature = await loadFeature();

    const result = feature.prepareManualCategoryAssignment({
      lead: {
        ...unclassifiedLead,
        categoryResolution: "multiple_matches",
        categoryCandidateTypes: ["traditional_iul", "high_intent_iul"],
      },
      category: traditionalIul,
    });

    assert.equal(result.update.categoryResolution, "matched");
    assert.deepEqual(result.update.categoryCandidateTypes, [
      "traditional_iul",
    ]);
  });

  test("rejects assignment outside unresolved review and to disabled categories", async () => {
    const feature = await loadFeature();

    assert.throws(
      () =>
        feature.prepareManualCategoryAssignment({
          lead: {
            ...unclassifiedLead,
            status: "unmatched",
            categoryResolution: "matched",
            leadType: "traditional_iul",
          },
          category: traditionalIul,
        }),
      /review|unresolved/i,
    );

    assert.throws(
      () =>
        feature.prepareManualCategoryAssignment({
          lead: unclassifiedLead,
          category: { ...traditionalIul, enabled: false },
        }),
      /enabled|disabled/i,
    );
  });
});
