/**
 * #82 — Aged-lead purchasing rules
 *
 * Pure assertion tests against production helpers (no DB).
 * Same style as test-outbound / test-matching.
 *
 * Run: pnpm run test:aged-rules
 */

import assert from "node:assert/strict";
import { LeadStatus } from "@prisma/client";
import {
  partnerAgedLeadAgeDays,
  partnerAgedLeadMatchesAgeBucket,
  type AdminAgedLeadAgeFilter,
} from "../src/lib/admin/admin-aged-leads-filters";
import {
  AGED_RETIRED_SENTINEL,
  agedMarketplaceEligibilityWhere,
  buildAgedLeadWhereWithCutoff,
  computeAgedSaleUpdate,
  getAgedCutoffDateSync,
  getNextAgedBracketAvailableAfter,
  isAgedMarketplaceEligible,
  type AgedLeadAvailability,
} from "../src/lib/aged/eligibility";

function daysAgo(days: number, from: Date = new Date()): Date {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Compose production eligibility + bucket math with an injectable `now`. */
function appearsInAgeBucket(
  lead: AgedLeadAvailability & { receivedAt: Date },
  bucket: AdminAgedLeadAgeFilter,
  now: Date = new Date(),
): boolean {
  if (!isAgedMarketplaceEligible(lead, now)) return false;
  const ageDays = Math.floor(
    (now.getTime() - lead.receivedAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  // Half-open brackets matching getNextAgedBracketAvailableAfter ([30,60), [60,90), [90,+∞)).
  if (bucket === "30") return ageDays >= 30 && ageDays < 60;
  if (bucket === "60") return ageDays >= 60 && ageDays < 90;
  return ageDays >= 90;
}

let passed = 0;
function check(label: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${label}`);
  } catch (err) {
    console.error(`  ✗ ${label}`);
    throw err;
  }
}

const now = new Date("2026-07-27T12:00:00.000Z");

console.log("\n#82 aged purchase rules — production helpers\n");

console.log("Existing age-bucket helpers (regression)");
check("partnerAgedLeadAgeDays ≈ 45 for lead received 45d ago", () => {
  const receivedAt = daysAgo(45);
  const days = partnerAgedLeadAgeDays(receivedAt);
  assert.ok(days >= 44 && days <= 45, `expected ~45, got ${days}`);
});

check("30–60 bucket match", () => {
  const receivedAt = daysAgo(45);
  assert.equal(partnerAgedLeadMatchesAgeBucket(receivedAt, "30"), true);
  assert.equal(partnerAgedLeadMatchesAgeBucket(receivedAt, "60"), false);
  assert.equal(partnerAgedLeadMatchesAgeBucket(receivedAt, "90"), false);
});

check("60–90 bucket match", () => {
  const receivedAt = daysAgo(75);
  assert.equal(partnerAgedLeadMatchesAgeBucket(receivedAt, "60"), true);
  assert.equal(partnerAgedLeadMatchesAgeBucket(receivedAt, "30"), false);
});

check("90+ bucket match", () => {
  const receivedAt = daysAgo(120);
  assert.equal(partnerAgedLeadMatchesAgeBucket(receivedAt, "90"), true);
  assert.equal(partnerAgedLeadMatchesAgeBucket(receivedAt, "60"), false);
});

check("getAgedCutoffDateSync(30) is ~30 days ago", () => {
  const cutoff = getAgedCutoffDateSync(30);
  const diffDays = (Date.now() - cutoff.getTime()) / (1000 * 60 * 60 * 24);
  assert.ok(diffDays >= 29.5 && diffDays <= 30.5, `got ${diffDays}`);
});

check("buildAgedLeadWhereWithCutoff keeps base aged filters + #82 gate", () => {
  const cutoff = new Date("2026-06-27T00:00:00.000Z");
  const where = buildAgedLeadWhereWithCutoff(cutoff, undefined, now);
  assert.ok(Array.isArray(where.AND));
  const base = where.AND![0] as Record<string, unknown>;
  assert.deepEqual(base.receivedAt, { lte: cutoff });
  assert.deepEqual(base.status, { not: LeadStatus.dead });
  assert.deepEqual(base.agedSaleCount, { lt: 2 });
});

console.log("\nNext age-bracket boundary");
check("30–60 day lead → available after receivedAt + 60d", () => {
  const receivedAt = daysAgo(45, now);
  const next = getNextAgedBracketAvailableAfter(receivedAt, now);
  assert.ok(next, "expected a next bracket date");
  assert.equal(next!.toISOString(), addDays(receivedAt, 60).toISOString());
});

check("60–90 day lead → available after receivedAt + 90d", () => {
  const receivedAt = daysAgo(75, now);
  const next = getNextAgedBracketAvailableAfter(receivedAt, now);
  assert.ok(next, "expected a next bracket date");
  assert.equal(next!.toISOString(), addDays(receivedAt, 90).toISOString());
});

check("90+ day lead → no next bracket (null)", () => {
  const receivedAt = daysAgo(120, now);
  assert.equal(getNextAgedBracketAvailableAfter(receivedAt, now), null);
});

check("exactly 60 days old → next is +90d (now in 60–90 bucket)", () => {
  const receivedAt = daysAgo(60, now);
  const next = getNextAgedBracketAvailableAfter(receivedAt, now);
  assert.ok(next);
  assert.equal(next!.toISOString(), addDays(receivedAt, 90).toISOString());
});

console.log("\nEligibility (agedSaleCount + agedAvailableAfter)");
check("never-purchased lead (count=0, after=null) is eligible", () => {
  assert.equal(
    isAgedMarketplaceEligible({ agedSaleCount: 0, agedAvailableAfter: null }, now),
    true,
  );
});

check("cooling-off lead (count=1, after in future) is NOT eligible", () => {
  assert.equal(
    isAgedMarketplaceEligible(
      { agedSaleCount: 1, agedAvailableAfter: addDays(now, 10) },
      now,
    ),
    false,
  );
});

check("lead past agedAvailableAfter (count=1) is eligible again", () => {
  assert.equal(
    isAgedMarketplaceEligible(
      { agedSaleCount: 1, agedAvailableAfter: daysAgo(1, now) },
      now,
    ),
    true,
  );
});

check("second-sale retired lead (count=2) is never eligible", () => {
  assert.equal(
    isAgedMarketplaceEligible(
      { agedSaleCount: 2, agedAvailableAfter: daysAgo(100, now) },
      now,
    ),
    false,
  );
  assert.equal(
    isAgedMarketplaceEligible(
      { agedSaleCount: 2, agedAvailableAfter: null },
      now,
    ),
    false,
  );
});

check("eligibility where clause shape", () => {
  const clause = agedMarketplaceEligibilityWhere(now);
  assert.deepEqual(clause.agedSaleCount, { lt: 2 });
  assert.ok(Array.isArray(clause.OR));
});

console.log("\nPost-purchase field updates");
check("1st purchase in 30–60: count=1, after=receivedAt+60d", () => {
  const receivedAt = daysAgo(45, now);
  const update = computeAgedSaleUpdate({ receivedAt, agedSaleCount: 0 }, now);
  assert.equal(update.agedSaleCount, 1);
  assert.equal(
    update.agedAvailableAfter.toISOString(),
    addDays(receivedAt, 60).toISOString(),
  );
});

check("1st purchase in 60–90: count=1, after=receivedAt+90d", () => {
  const receivedAt = daysAgo(75, now);
  const update = computeAgedSaleUpdate({ receivedAt, agedSaleCount: 0 }, now);
  assert.equal(update.agedSaleCount, 1);
  assert.equal(
    update.agedAvailableAfter.toISOString(),
    addDays(receivedAt, 90).toISOString(),
  );
});

check("1st purchase in 90+: count=1, after=far-future (no next bracket)", () => {
  const receivedAt = daysAgo(120, now);
  const update = computeAgedSaleUpdate({ receivedAt, agedSaleCount: 0 }, now);
  assert.equal(update.agedSaleCount, 1);
  assert.equal(
    update.agedAvailableAfter.toISOString(),
    AGED_RETIRED_SENTINEL.toISOString(),
  );
});

check("2nd purchase: count=2 and permanently retired", () => {
  const receivedAt = daysAgo(75, now);
  const update = computeAgedSaleUpdate({ receivedAt, agedSaleCount: 1 }, now);
  assert.equal(update.agedSaleCount, 2);
  assert.equal(
    update.agedAvailableAfter.toISOString(),
    AGED_RETIRED_SENTINEL.toISOString(),
  );
  assert.equal(
    isAgedMarketplaceEligible(
      {
        agedSaleCount: update.agedSaleCount,
        agedAvailableAfter: update.agedAvailableAfter,
      },
      now,
    ),
    false,
  );
});

console.log("\nMarketplace scenarios (Done looks like)");
check("purchase in 30–60 hides immediately; reappears in 60–90 after aging", () => {
  const receivedAt = daysAgo(45, now);
  const before = {
    receivedAt,
    agedSaleCount: 0,
    agedAvailableAfter: null as Date | null,
  };
  assert.equal(appearsInAgeBucket(before, "30", now), true);

  const update = computeAgedSaleUpdate(before, now);
  const cooling = {
    receivedAt,
    agedSaleCount: update.agedSaleCount,
    agedAvailableAfter: update.agedAvailableAfter,
  };
  assert.equal(appearsInAgeBucket(cooling, "30", now), false);
  assert.equal(appearsInAgeBucket(cooling, "60", now), false);

  const afterBoundary = addDays(receivedAt, 60);
  afterBoundary.setUTCSeconds(afterBoundary.getUTCSeconds() + 1);
  assert.equal(appearsInAgeBucket(cooling, "60", afterBoundary), true);
  assert.equal(appearsInAgeBucket(cooling, "30", afterBoundary), false);
});

check("purchase in 60–90 hides; reappears in 90+ after aging past 90d", () => {
  const receivedAt = daysAgo(75, now);
  const update = computeAgedSaleUpdate({ receivedAt, agedSaleCount: 0 }, now);
  const cooling = {
    receivedAt,
    agedSaleCount: update.agedSaleCount,
    agedAvailableAfter: update.agedAvailableAfter,
  };
  assert.equal(appearsInAgeBucket(cooling, "60", now), false);

  const after90 = addDays(receivedAt, 90);
  after90.setUTCSeconds(after90.getUTCSeconds() + 1);
  assert.equal(appearsInAgeBucket(cooling, "90", after90), true);
  assert.equal(appearsInAgeBucket(cooling, "60", after90), false);
});

check("after 2nd purchase lead never reappears in any bucket", () => {
  const receivedAt = daysAgo(45, now);
  const first = computeAgedSaleUpdate({ receivedAt, agedSaleCount: 0 }, now);
  const atNextBracket = addDays(receivedAt, 60);
  atNextBracket.setUTCHours(12, 0, 0, 0);
  const second = computeAgedSaleUpdate(
    { receivedAt, agedSaleCount: first.agedSaleCount },
    atNextBracket,
  );
  const retired = {
    receivedAt,
    agedSaleCount: second.agedSaleCount,
    agedAvailableAfter: second.agedAvailableAfter,
  };
  const farFuture = addDays(receivedAt, 400);
  assert.equal(appearsInAgeBucket(retired, "30", farFuture), false);
  assert.equal(appearsInAgeBucket(retired, "60", farFuture), false);
  assert.equal(appearsInAgeBucket(retired, "90", farFuture), false);
});

check("zero-purchase leads still appear exactly as before", () => {
  const lead45 = {
    receivedAt: daysAgo(45, now),
    agedSaleCount: 0,
    agedAvailableAfter: null as Date | null,
  };
  const lead75 = {
    receivedAt: daysAgo(75, now),
    agedSaleCount: 0,
    agedAvailableAfter: null as Date | null,
  };
  const lead120 = {
    receivedAt: daysAgo(120, now),
    agedSaleCount: 0,
    agedAvailableAfter: null as Date | null,
  };
  assert.equal(appearsInAgeBucket(lead45, "30", now), true);
  assert.equal(appearsInAgeBucket(lead75, "60", now), true);
  assert.equal(appearsInAgeBucket(lead120, "90", now), true);
});

console.log(`\nAll ${passed} assertions passed.\n`);
