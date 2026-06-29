/**
 * Unit-style tests for matching eligibility logic (no DB required).
 * Run: node scripts/test-matching.mjs
 */

import assert from "node:assert/strict";
import { LeadType, PartnerStatus } from "@prisma/client";

// Inline copies of pure functions to avoid TS import in .mjs
function getEffectivePrice(partner, defaultPrice) {
  if (partner.priceOverride !== null) return Number(partner.priceOverride);
  return defaultPrice;
}

function isPartnerEligibleForLead(partner, leadState, leadType, effectivePrice) {
  if (partner.status !== PartnerStatus.active) return false;
  if (partner.filterStates.length < 15) return false;
  if (!partner.filterStates.includes(leadState)) return false;
  if (partner.leadType !== leadType) return false;
  if (Number(partner.walletBalance) < effectivePrice) return false;
  return true;
}

const TX_STATES = [
  "TX", "OK", "LA", "AR", "NM", "AZ", "CO", "KS", "MO", "IL",
  "IN", "OH", "KY", "TN", "MS", "AL", "GA", "FL", "SC", "NC",
];

const basePartner = {
  status: PartnerStatus.active,
  filterStates: TX_STATES,
  leadType: LeadType.high_intent_iul,
  walletBalance: 500,
  priceOverride: null,
};

// Test: eligible partner
assert.equal(
  isPartnerEligibleForLead(basePartner, "TX", LeadType.high_intent_iul, 25),
  true,
  "Active partner with 15+ states and balance should be eligible",
);

// Test: insufficient wallet
assert.equal(
  isPartnerEligibleForLead(
    { ...basePartner, walletBalance: 5 },
    "TX",
    LeadType.high_intent_iul,
    25,
  ),
  false,
  "Partner with low balance should be excluded",
);

// Test: too few states
assert.equal(
  isPartnerEligibleForLead(
    { ...basePartner, filterStates: ["TX", "CA", "FL", "NY", "IL"] },
    "TX",
    LeadType.high_intent_iul,
    25,
  ),
  false,
  "Partner with <15 states should be excluded",
);

// Test: wrong state
assert.equal(
  isPartnerEligibleForLead(basePartner, "CA", LeadType.high_intent_iul, 25),
  false,
  "Partner without CA in filter should be excluded for CA lead",
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

// Test: price override
assert.equal(getEffectivePrice({ priceOverride: 20 }, 25), 20);
assert.equal(getEffectivePrice({ priceOverride: null }, 25), 25);

console.log("All matching logic tests passed.");
