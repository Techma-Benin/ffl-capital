import assert from "node:assert/strict";
import { describe, test } from "node:test";

type Category = {
  type: string;
  label: string;
};

type Presentation = {
  label: string;
  candidateLabels: string[];
};

type PresentationFeature = {
  resolveLeadCategoryPresentation(input: {
    leadType: string | null;
    categoryResolution: "matched" | "no_match" | "multiple_matches";
    categoryCandidateTypes: string[];
    categories: Category[];
  }): Presentation;
};

const featureModule =
  "../../src/lib/lead-categories/category-presentation";

async function loadFeature(): Promise<PresentationFeature> {
  try {
    return (await import(featureModule)) as PresentationFeature;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Cannot find module") ||
        error.message.includes("ERR_MODULE_NOT_FOUND"))
    ) {
      assert.fail(
        "Category presentation is not implemented: expected " +
          "src/lib/lead-categories/category-presentation.ts",
      );
    }
    throw error;
  }
}

const categories: Category[] = [
  { type: "traditional_iul", label: "Traditional IUL" },
  { type: "mortgage_protection", label: "Mortgage Protection" },
  { type: "veteran", label: "Veteran Leads" },
];

describe("planned category presentation", () => {
  test("uses the configured display label for a matched category", async () => {
    const feature = await loadFeature();

    const result = feature.resolveLeadCategoryPresentation({
      leadType: "veteran",
      categoryResolution: "matched",
      categoryCandidateTypes: ["veteran"],
      categories,
    });

    assert.equal(result.label, "Veteran Leads");
    assert.deepEqual(result.candidateLabels, []);
  });

  test("shows Unclassified when no category matched", async () => {
    const feature = await loadFeature();

    const result = feature.resolveLeadCategoryPresentation({
      leadType: null,
      categoryResolution: "no_match",
      categoryCandidateTypes: [],
      categories,
    });

    assert.equal(result.label, "Unclassified");
    assert.deepEqual(result.candidateLabels, []);
  });

  test("shows Multiple match and resolves candidate chips from the table", async () => {
    const feature = await loadFeature();

    const result = feature.resolveLeadCategoryPresentation({
      leadType: null,
      categoryResolution: "multiple_matches",
      categoryCandidateTypes: ["mortgage_protection", "veteran"],
      categories,
    });

    assert.equal(result.label, "Multiple match");
    assert.deepEqual(result.candidateLabels, [
      "Mortgage Protection",
      "Veteran Leads",
    ]);
  });

  test("never labels a non-IUL category as High Intent IUL", async () => {
    const feature = await loadFeature();

    const result = feature.resolveLeadCategoryPresentation({
      leadType: "mortgage_protection",
      categoryResolution: "matched",
      categoryCandidateTypes: ["mortgage_protection"],
      categories,
    });

    assert.equal(result.label, "Mortgage Protection");
    assert.notEqual(result.label, "High Intent IUL");
  });
});
