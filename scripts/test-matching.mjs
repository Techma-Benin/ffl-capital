/**
 * Unit-style tests for matching eligibility logic (no DB required).
 * Run: node scripts/test-matching.mjs
 */

import assert from "node:assert/strict";
import { PartnerStatus } from "@prisma/client";

// Inline copies of pure functions to avoid TS import in .mjs
function getEffectivePrice(filterSet, partner, defaultPrice) {
  if (filterSet.priceOverride !== null && filterSet.priceOverride !== undefined) {
    return Number(filterSet.priceOverride);
  }
  if (partner.priceOverride !== null && partner.priceOverride !== undefined) {
    return Number(partner.priceOverride);
  }
  return defaultPrice;
}

function isFilterSetEligibleForLead(
  filterSet,
  partner,
  leadState,
  leadType,
  effectivePrice,
) {
  if (partner.status !== PartnerStatus.active) return false;
  if (!filterSet.active) return false;
  if (filterSet.filterStates.length < 15) return false;
  if (!filterSet.filterStates.includes(leadState)) return false;
  if (filterSet.leadType !== leadType) return false;
  if (Number(partner.walletBalance) < effectivePrice) return false;
  return true;
}

const TX_STATES = [
  "TX", "OK", "LA", "AR", "NM", "AZ", "CO", "KS", "MO", "IL",
  "IN", "OH", "KY", "TN", "MS", "AL", "GA", "FL", "SC", "NC",
];

const basePartner = {
  status: PartnerStatus.active,
  walletBalance: 500,
  priceOverride: null,
};

const baseFilterSet = {
  active: true,
  filterStates: TX_STATES,
  leadType: "high_intent_iul",
  priceOverride: null,
};

// Test: eligible filter set
assert.equal(
  isFilterSetEligibleForLead(
    baseFilterSet,
    basePartner,
    "TX",
    "high_intent_iul",
    25,
  ),
  true,
  "Active filter set with 15+ states and balance should be eligible",
);

// Test: insufficient wallet
assert.equal(
  isFilterSetEligibleForLead(
    baseFilterSet,
    { ...basePartner, walletBalance: 5 },
    "TX",
    "high_intent_iul",
    25,
  ),
  false,
  "Partner with low balance should be excluded",
);

// Test: too few states
assert.equal(
  isFilterSetEligibleForLead(
    { ...baseFilterSet, filterStates: ["TX", "CA", "FL", "NY", "IL"] },
    basePartner,
    "TX",
    "high_intent_iul",
    25,
  ),
  false,
  "Filter set with <15 states should be excluded",
);

// Test: wrong state
assert.equal(
  isFilterSetEligibleForLead(
    baseFilterSet,
    basePartner,
    "CA",
    "high_intent_iul",
    25,
  ),
  false,
  "Filter set without CA should be excluded for CA lead",
);

// Test: FIFO sort order
const partners = [
  { priority: 8, createdAt: new Date("2025-02-01") },
  { priority: 10, createdAt: new Date("2025-01-01") },
  { priority: 8, createdAt: new Date("2025-01-01") },
  { priority: 8, createdAt: new Date("2024-12-01") },
];

partners.sort((a, b) => {
  if (b.priority !== a.priority) return b.priority - a.priority;
  return a.createdAt.getTime() - b.createdAt.getTime();
});

assert.equal(partners[0].priority, 10, "Highest priority wins");
assert.equal(
  partners[1].createdAt.getTime(),
  new Date("2024-12-01").getTime(),
  "FIFO: oldest partner wins on tie",
);

// Test: price override on filter set
assert.equal(
  getEffectivePrice({ priceOverride: 20 }, { priceOverride: null }, 25),
  20,
);
assert.equal(
  getEffectivePrice({ priceOverride: null }, { priceOverride: 18 }, 25),
  18,
);
assert.equal(
  getEffectivePrice({ priceOverride: null }, { priceOverride: null }, 25),
  25,
);

console.log("All matching logic tests passed.");
