import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  resolveLeadCategoryBadgeKey,
  resolveLeadCategoryBadgeVariant,
} from "../../src/lib/lead-categories/category-badge-variant";
import {
  MULTIPLE_CATEGORY_MATCH_TYPE_FILTER,
  UNCLASSIFIED_TYPE_FILTER,
} from "../../src/lib/leads/list-view-schema";

describe("category badge variant mapping", () => {
  test("maps known category types to distinct blue-toned variants", () => {
    assert.equal(
      resolveLeadCategoryBadgeVariant({
        leadType: "traditional_iul",
        categoryResolution: "matched",
      }),
      "blue",
    );
    assert.equal(
      resolveLeadCategoryBadgeVariant({
        leadType: "high_intent_iul",
        categoryResolution: "matched",
      }),
      "sky",
    );
    assert.equal(
      resolveLeadCategoryBadgeVariant({
        leadType: "mortgage_protection",
        categoryResolution: "matched",
      }),
      "indigo",
    );
    assert.equal(
      resolveLeadCategoryBadgeVariant({
        leadType: "final_expense",
        categoryResolution: "matched",
      }),
      "cyan",
    );
  });

  test("maps unclassified and multiple-match sentinels", () => {
    assert.equal(
      resolveLeadCategoryBadgeKey({
        leadType: null,
        categoryResolution: "no_match",
      }),
      UNCLASSIFIED_TYPE_FILTER,
    );
    assert.equal(
      resolveLeadCategoryBadgeVariant({
        leadType: null,
        categoryResolution: "no_match",
      }),
      "steel",
    );

    assert.equal(
      resolveLeadCategoryBadgeKey({
        leadType: null,
        categoryResolution: "multiple_matches",
      }),
      MULTIPLE_CATEGORY_MATCH_TYPE_FILTER,
    );
    assert.equal(
      resolveLeadCategoryBadgeVariant({
        leadType: null,
        categoryResolution: "multiple_matches",
      }),
      "teal",
    );
  });

  test("infers multiple match from label when resolution is unavailable", () => {
    assert.equal(
      resolveLeadCategoryBadgeVariant({
        leadType: "",
        leadTypeLabel: "Multiple match",
      }),
      "teal",
    );
  });

  test("returns a stable variant for unknown category types", () => {
    const first = resolveLeadCategoryBadgeVariant({
      leadType: "veteran",
      categoryResolution: "matched",
    });
    const second = resolveLeadCategoryBadgeVariant({
      leadType: "veteran",
      categoryResolution: "matched",
    });

    assert.equal(first, second);
    assert.notEqual(first, "purple");
  });
});
