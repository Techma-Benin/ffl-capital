import assert from "node:assert/strict";
import { describe, test } from "node:test";

type Criterion = { field: string; value: string };
type Category = {
  type: string;
  label: string;
  enabled: boolean;
  criteria: Criterion[];
};
type CategoryOutcome = {
  outcome: "one" | "zero" | "multiple";
  matchedTypes: string[];
  categoryType: string | null;
  status: "unmatched" | "review";
  available: boolean;
  proceedToPartnerMatching: boolean;
  proceedToIntegrity: boolean;
};
type Schema = {
  safeParse(value: unknown): { success: boolean };
};
type FlexibleCategoryFeature = {
  deriveCategoryType(input: {
    label: string;
    existingType?: string;
    occupiedTypes?: string[];
  }): string;
  evaluateLeadCategories(
    payload: Record<string, unknown>,
    categories: Category[],
  ): CategoryOutcome;
  categoryCreateSchema: Schema;
};

const featureModule =
  "../../src/lib/lead-categories/flexible-lead-categories";

async function loadFeature(): Promise<FlexibleCategoryFeature> {
  try {
    return (await import(featureModule)) as FlexibleCategoryFeature;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Cannot find module") ||
        error.message.includes("ERR_MODULE_NOT_FOUND"))
    ) {
      assert.fail(
        "Flexible lead categories are not implemented: expected " +
          "src/lib/lead-categories/flexible-lead-categories.ts",
      );
    }
    throw error;
  }
}

const category = (
  type: string,
  criteria: Criterion[],
  enabled = true,
): Category => ({
  type,
  label: type,
  enabled,
  criteria,
});

describe("planned category internal keys", () => {
  test("generates a snake_case internal type from the display label", async () => {
    const feature = await loadFeature();

    assert.equal(
      feature.deriveCategoryType({ label: "Mortgage Protection Plus" }),
      "mortgage_protection_plus",
    );
  });

  test("keeps an existing category internal type unchanged", async () => {
    const feature = await loadFeature();

    assert.equal(
      feature.deriveCategoryType({
        label: "Renamed Display Label",
        existingType: "traditional_iul",
        occupiedTypes: ["traditional_iul"],
      }),
      "traditional_iul",
    );
  });

  test("rejects generated internal type collisions", async () => {
    const feature = await loadFeature();

    assert.throws(
      () =>
        feature.deriveCategoryType({
          label: "Traditional IUL",
          occupiedTypes: ["traditional_iul"],
        }),
      /collision|already exists/i,
    );
  });
});

describe("planned criteria evaluation", () => {
  test("requires all criteria in a category to match", async () => {
    const feature = await loadFeature();
    const categories = [
      category("veteran_mortgage", [
        { field: "SRC", value: "AP-Veterans" },
        { field: "Product", value: "Mortgage" },
      ]),
    ];

    assert.equal(
      feature.evaluateLeadCategories(
        { SRC: "AP-Veterans", Product: "IUL" },
        categories,
      ).outcome,
      "zero",
    );
    assert.equal(
      feature.evaluateLeadCategories(
        { SRC: "AP-Veterans", Product: "Mortgage" },
        categories,
      ).outcome,
      "one",
    );
  });

  test("matches field names case-sensitively", async () => {
    const feature = await loadFeature();

    assert.equal(
      feature.evaluateLeadCategories(
        { src: "AP-Veterans" },
        [category("veteran", [{ field: "SRC", value: "AP-Veterans" }])],
      ).outcome,
      "zero",
    );
  });

  test("matches field values case-sensitively", async () => {
    const feature = await loadFeature();

    assert.equal(
      feature.evaluateLeadCategories(
        { SRC: "ap-veterans" },
        [category("veteran", [{ field: "SRC", value: "AP-Veterans" }])],
      ).outcome,
      "zero",
    );
  });

  test("matches top-level ActiveProspect payload fields only", async () => {
    const feature = await loadFeature();

    assert.equal(
      feature.evaluateLeadCategories(
        { metadata: { SRC: "AP-Veterans" } },
        [category("veteran", [{ field: "SRC", value: "AP-Veterans" }])],
      ).outcome,
      "zero",
    );
  });

  test("returns an explicit one-match outcome", async () => {
    const feature = await loadFeature();
    const result = feature.evaluateLeadCategories(
      { SRC: "AP-Veterans" },
      [category("veteran", [{ field: "SRC", value: "AP-Veterans" }])],
    );

    assert.equal(result.outcome, "one");
    assert.deepEqual(result.matchedTypes, ["veteran"]);
    assert.equal(result.categoryType, "veteran");
  });

  test("returns an explicit zero-match outcome", async () => {
    const feature = await loadFeature();
    const result = feature.evaluateLeadCategories(
      { SRC: "unknown" },
      [category("veteran", [{ field: "SRC", value: "AP-Veterans" }])],
    );

    assert.equal(result.outcome, "zero");
    assert.deepEqual(result.matchedTypes, []);
    assert.equal(result.categoryType, null);
  });

  test("returns an explicit multiple-match outcome", async () => {
    const feature = await loadFeature();
    const result = feature.evaluateLeadCategories(
      { SRC: "shared" },
      [
        category("first", [{ field: "SRC", value: "shared" }]),
        category("second", [{ field: "SRC", value: "shared" }]),
      ],
    );

    assert.equal(result.outcome, "multiple");
    assert.deepEqual(result.matchedTypes, ["first", "second"]);
    assert.equal(result.categoryType, null);
  });

  test("excludes disabled categories from evaluation", async () => {
    const feature = await loadFeature();
    const result = feature.evaluateLeadCategories(
      { SRC: "shared" },
      [
        category("enabled", [{ field: "SRC", value: "shared" }]),
        category("disabled", [{ field: "SRC", value: "shared" }], false),
      ],
    );

    assert.equal(result.outcome, "one");
    assert.deepEqual(result.matchedTypes, ["enabled"]);
  });

  test("expresses existing exact SRC rules as criterion rows", async () => {
    const feature = await loadFeature();
    const result = feature.evaluateLeadCategories(
      { SRC: "AP-Mortgage-Exclusive" },
      [
        category("mortgage_protection", [
          { field: "SRC", value: "AP-Mortgage-Exclusive" },
        ]),
      ],
    );

    assert.equal(result.outcome, "one");
    assert.equal(result.categoryType, "mortgage_protection");
  });
});

describe("planned intake routing guardrails", () => {
  test("marks zero matches unavailable for review and skips downstream work", async () => {
    const feature = await loadFeature();
    const result = feature.evaluateLeadCategories(
      { SRC: "unknown" },
      [category("known", [{ field: "SRC", value: "known" }])],
    );

    assert.equal(result.status, "review");
    assert.equal(result.available, false);
    assert.equal(result.proceedToPartnerMatching, false);
    assert.equal(result.proceedToIntegrity, false);
  });

  test("marks multiple matches unavailable for review and skips downstream work", async () => {
    const feature = await loadFeature();
    const result = feature.evaluateLeadCategories(
      { SRC: "shared" },
      [
        category("first", [{ field: "SRC", value: "shared" }]),
        category("second", [{ field: "SRC", value: "shared" }]),
      ],
    );

    assert.equal(result.status, "review");
    assert.equal(result.available, false);
    assert.equal(result.proceedToPartnerMatching, false);
    assert.equal(result.proceedToIntegrity, false);
  });
});

describe("planned category API validation", () => {
  test("accepts label and non-empty criteria without an internal type", async () => {
    const feature = await loadFeature();

    assert.equal(
      feature.categoryCreateSchema.safeParse({
        label: "Veterans",
        criteria: [{ field: "SRC", value: "AP-Veterans" }],
      }).success,
      true,
    );
  });

  test("rejects empty or invalid criteria", async () => {
    const feature = await loadFeature();

    assert.equal(
      feature.categoryCreateSchema.safeParse({
        label: "Veterans",
        criteria: [],
      }).success,
      false,
    );
    assert.equal(
      feature.categoryCreateSchema.safeParse({
        label: "Veterans",
        criteria: [{ field: "", value: "AP-Veterans" }],
      }).success,
      false,
    );
    assert.equal(
      feature.categoryCreateSchema.safeParse({
        label: "Veterans",
        criteria: [{ field: "SRC", value: "" }],
      }).success,
      false,
    );
  });

  test("rejects an admin-supplied internal type", async () => {
    const feature = await loadFeature();

    assert.equal(
      feature.categoryCreateSchema.safeParse({
        type: "admin_chosen_key",
        label: "Veterans",
        criteria: [{ field: "SRC", value: "AP-Veterans" }],
      }).success,
      false,
    );
  });

  test("accepts maxRealtimeSells between 1 and 20", async () => {
    const feature = await loadFeature();

    assert.equal(
      feature.categoryCreateSchema.safeParse({
        label: "Cage Protection",
        criteria: [{ field: "SRC", value: "AP-Cage" }],
        maxRealtimeSells: 2,
      }).success,
      true,
    );
    assert.equal(
      feature.categoryCreateSchema.safeParse({
        label: "Cage Protection",
        criteria: [{ field: "SRC", value: "AP-Cage" }],
        maxRealtimeSells: 0,
      }).success,
      false,
    );
  });
});
