import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Lead, Partner, PartnerFilterSet } from "@prisma/client";
import {
  explainPartnerFilterIneligibility,
  isFilterSetEligibleForLead,
} from "../../src/lib/matching/eligibility";

const states = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
];

const filterSet = {
  active: true,
  isTemplate: false,
  filterStates: states,
  leadType: "traditional_iul",
  filterCriteria: {},
} as PartnerFilterSet;

const partner = {
  status: "active",
  walletBalance: 0,
} as unknown as Partner;

const lead = {
  state: "GA",
  leadType: "traditional_iul",
  intent: null,
  haveIul: null,
  boberdooLeadType: null,
  age: null,
  source: "meta",
  subId: null,
  pubId: null,
} as unknown as Lead;

describe("isFilterSetEligibleForLead wallet option", () => {
  test("empty wallet fails when wallet is required", () => {
    assert.equal(
      isFilterSetEligibleForLead(
        filterSet,
        partner,
        "GA",
        "traditional_iul",
        25,
        lead,
      ),
      false,
    );
  });

  test("empty wallet still matches filters when wallet is not required", () => {
    assert.equal(
      isFilterSetEligibleForLead(
        filterSet,
        partner,
        "GA",
        "traditional_iul",
        25,
        lead,
        false,
      ),
      true,
    );
  });
});

describe("explainPartnerFilterIneligibility", () => {
  test("says there is no active filter set", () => {
    assert.equal(
      explainPartnerFilterIneligibility([], partner, "GA", "traditional_iul", lead),
      "This partner has no active filter set.",
    );
  });

  test("names a category miss before a state miss", () => {
    const otherType = {
      ...filterSet,
      leadType: "final_expense",
    } as PartnerFilterSet;
    assert.equal(
      explainPartnerFilterIneligibility(
        [otherType],
        partner,
        "GA",
        "traditional_iul",
        lead,
      ),
      "This partner has no filter set for this lead category.",
    );
  });

  test("names a state miss when the category matches", () => {
    assert.equal(
      explainPartnerFilterIneligibility(
        [filterSet],
        partner,
        "NJ",
        "traditional_iul",
        lead,
      ),
      "This partner does not target this lead's state.",
    );
  });
});
