import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  LeadCategoryResolution,
  LeadStatus,
} from "@prisma/client";
import { evaluateLeadCategories } from "../../src/lib/lead-categories/flexible-lead-categories";
import {
  categoryOutcomeToLeadUpdate,
  isFinalizedCategoryStatus,
} from "../../src/lib/lead-categories/reclassify-leads";

const categories = [
  {
    type: "mortgage",
    label: "Mortgage",
    enabled: true,
    criteria: [{ field: "SRC", value: "shared" }],
  },
  {
    type: "veteran",
    label: "Veteran",
    enabled: true,
    criteria: [{ field: "Segment", value: "veteran" }],
  },
];

describe("category reclassification outcomes", () => {
  test("makes a single match unmatched and available without delivering it", () => {
    const update = categoryOutcomeToLeadUpdate(
      evaluateLeadCategories({ SRC: "shared" }, categories),
    );

    assert.deepEqual(update, {
      leadType: "mortgage",
      categoryResolution: LeadCategoryResolution.matched,
      categoryCandidateTypes: ["mortgage"],
      status: LeadStatus.unmatched,
      available: true,
    });
  });

  test("makes no-match and multiple-match leads unavailable for review", () => {
    const noMatch = categoryOutcomeToLeadUpdate(
      evaluateLeadCategories({ SRC: "unknown" }, categories),
    );
    const multiple = categoryOutcomeToLeadUpdate(
      evaluateLeadCategories(
        { SRC: "shared", Segment: "veteran" },
        categories,
      ),
    );

    assert.deepEqual(noMatch, {
      leadType: null,
      categoryResolution: LeadCategoryResolution.no_match,
      categoryCandidateTypes: [],
      status: LeadStatus.review,
      available: false,
    });
    assert.deepEqual(multiple, {
      leadType: null,
      categoryResolution: LeadCategoryResolution.multiple_matches,
      categoryCandidateTypes: ["mortgage", "veteran"],
      status: LeadStatus.review,
      available: false,
    });
  });

  test("excludes every finalized lead status", () => {
    for (const status of [
      LeadStatus.delivered,
      LeadStatus.integrity_posted,
      LeadStatus.aged_listed,
      LeadStatus.dead,
    ]) {
      assert.equal(isFinalizedCategoryStatus(status), true);
    }
    assert.equal(isFinalizedCategoryStatus(LeadStatus.unmatched), false);
    assert.equal(isFinalizedCategoryStatus(LeadStatus.review), false);
  });
});
