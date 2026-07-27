/**
 * #82 — Aged-lead purchasing rules
 *
 * Pure assertion tests (no DB). Follows the same style as test-outbound / test-matching.
 *
 * Run:
 *   pnpm exec tsx scripts/test-aged-purchase-rules.ts
 *   # or after package.json script is added:
 *   pnpm run test:aged-rules
 *
 * After the Replit agent lands #82, wire PRODUCTION_IMPORTS below to the real
 * helper exports so these assertions exercise production code instead of the
 * local reference implementations.
 */

import assert from "node:assert/strict";
import { LeadStatus } from "@prisma/client";
import {
  partnerAgedLeadAgeDays,
  partnerAgedLeadMatchesAgeBucket,
} from "../src/lib/admin/admin-aged-leads-filters";
import {
  buildAgedLeadWhereWithCutoff,
  getAgedCutoffDateSync,
} from "../src/lib/aged/eligibility";

// ---------------------------------------------------------------------------
// Age bracket thresholds (must match admin/partner marketplace buckets)
// ---------------------------------------------------------------------------

const AGED_BRACKET_DAYS = [30, 60, 90] as const;
const AGED_RETIRED_SENTINEL = new Date("9999-12-31T00:00:00.000Z");
const MAX_AGED_SALES = 2;

// ---------------------------------------------------------------------------
// Reference implementations of #82 rules
// Swap these for production imports once the agent exports them.
// ---------------------------------------------------------------------------

type AgedLeadAvailability = {
  agedSaleCount: number;
  agedAvailableAfter: Date | null | undefined;
  receivedAt?: Date;
};

/**
 * Returns the DateTime when the lead enters the *next* age bracket after its
 * current age (based on receivedAt vs `now`).
 * - 30–60 days old → receivedAt + 60d
 * - 60–90 days old → receivedAt + 90d
 * - 90+ days old   → null (no next bracket)
 * - under 30 days  → receivedAt + 30d (not aged yet; defensive)
 */
function getNextAgedBracketAvailableAfter(
  receivedAt: Date,
  now: Date = new Date(),
  thresholds: readonly number[] = AGED_BRACKET_DAYS,
): Date | null {
  const ageMs = now.getTime() - receivedAt.getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

  // Find the smallest threshold strictly greater than current age days.
  // Buckets: [30,60), [60,90), [90,+∞)
  // Purchase in [30,60) → unlock at 60; in [60,90) → unlock at 90; in [90,+∞) → none.
  for (let i = 0; i < thresholds.length; i++) {
    const lower = thresholds[i];
    const upper = thresholds[i + 1];
    if (upper === undefined) {
      // Final open-ended bracket (90+)
      if (ageDays >= lower) return null;
      break;
    }
    if (ageDays >= lower && ageDays < upper) {
      const next = new Date(receivedAt.getTime());
      next.setUTCDate(next.getUTCDate() + upper);
      return next;
    }
  }

  // Younger than first aged threshold — next availability is first bracket start
  if (ageDays < thresholds[0]) {
    const next = new Date(receivedAt.getTime());
    next.setUTCDate(next.getUTCDate() + thresholds[0]);
    return next;
  }

  return null;
}

/** Eligibility gate used by marketplace + admin aged list. */
function isAgedMarketplaceEligible(
  lead: AgedLeadAvailability,
  now: Date = new Date(),
): boolean {
  if (lead.agedSaleCount >= MAX_AGED_SALES) return false;
  if (lead.agedAvailableAfter == null) return true;
  return lead.agedAvailableAfter.getTime() <= now.getTime();
}

/**
 * Prisma-style where fragment for the #82 gate.
 * Production should AND this into buildAgedLeadWhere / admin filters.
 */
function agedMarketplaceEligibilityWhere(
  now: Date = new Date(),
): Record<string, unknown> {
  return {
    agedSaleCount: { lt: MAX_AGED_SALES },
    OR: [
      { agedAvailableAfter: null },
      { agedAvailableAfter: { lte: now } },
    ],
  };
}

/**
 * Side-effects after a successful aged purchase (pure; mirrors purchase tx update).
 */
function computeAgedSaleUpdate(
  lead: { receivedAt: Date; agedSaleCount: number },
  now: Date = new Date(),
): { agedSaleCount: number; agedAvailableAfter: Date } {
  const agedSaleCount = lead.agedSaleCount + 1;

  if (agedSaleCount >= MAX_AGED_SALES) {
    return { agedSaleCount, agedAvailableAfter: AGED_RETIRED_SENTINEL };
  }

  const next = getNextAgedBracketAvailableAfter(lead.receivedAt, now);
  return {
    agedSaleCount,
    agedAvailableAfter: next ?? AGED_RETIRED_SENTINEL,
  };
}

/** True when a lead with given availability should appear in an age bucket. */
function appearsInAgeBucket(
  lead: AgedLeadAvailability & { receivedAt: Date },
  bucket: "30" | "60" | "90",
  now: Date = new Date(),
): boolean {
  if (!isAgedMarketplaceEligible(lead, now)) return false;
  // partnerAgedLeadMatchesAgeBucket uses Date.now(); for deterministic tests
  // we inline the same bucket math against `now`.
  const ageDays = Math.floor(
    (now.getTime() - lead.receivedAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (bucket === "30") return ageDays >= 30 && ageDays < 60;
  if (bucket === "60") return ageDays >= 60 && ageDays < 90;
  return ageDays >= 90;
}

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

// ---------------------------------------------------------------------------
// Optional: bind to production helpers when the agent has exported them.
// Set PRODUCTION_IMPORTS = true and adjust the import paths/names as needed.
// ---------------------------------------------------------------------------

const PRODUCTION_IMPORTS = false;

async function loadProductionHelpers(): Promise<{
  getNextAgedBracketAvailableAfter: typeof getNextAgedBracketAvailableAfter;
  isAgedMarketplaceEligible: typeof isAgedMarketplaceEligible;
  computeAgedSaleUpdate: typeof computeAgedSaleUpdate;
  agedMarketplaceEligibilityWhere: typeof agedMarketplaceEligibilityWhere;
} | null> {
  if (!PRODUCTION_IMPORTS) return null;
  try {
    // Adjust export names to match whatever the Replit agent shipped.
    const mod = await import("../src/lib/aged/eligibility");
    const m = mod as Record<string, unknown>;
    if (
      typeof m.getNextAgedBracketAvailableAfter !== "function" ||
      typeof m.isAgedMarketplaceEligible !== "function"
    ) {
      console.warn(
        "PRODUCTION_IMPORTS=true but expected exports missing on eligibility.ts — using reference impls",
      );
      return null;
    }
    return {
      getNextAgedBracketAvailableAfter:
        m.getNextAgedBracketAvailableAfter as typeof getNextAgedBracketAvailableAfter,
      isAgedMarketplaceEligible:
        m.isAgedMarketplaceEligible as typeof isAgedMarketplaceEligible,
      computeAgedSaleUpdate:
        (typeof m.computeAgedSaleUpdate === "function"
          ? m.computeAgedSaleUpdate
          : computeAgedSaleUpdate) as typeof computeAgedSaleUpdate,
      agedMarketplaceEligibilityWhere:
        (typeof m.agedMarketplaceEligibilityWhere === "function"
          ? m.agedMarketplaceEligibilityWhere
          : agedMarketplaceEligibilityWhere) as typeof agedMarketplaceEligibilityWhere,
    };
  } catch (err) {
    console.warn("Could not load production aged helpers:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

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

async function main() {
  const prod = await loadProductionHelpers();
  const nextBracket = prod?.getNextAgedBracketAvailableAfter ?? getNextAgedBracketAvailableAfter;
  const isEligible = prod?.isAgedMarketplaceEligible ?? isAgedMarketplaceEligible;
  const afterSale = prod?.computeAgedSaleUpdate ?? computeAgedSaleUpdate;
  const eligibilityWhere =
    prod?.agedMarketplaceEligibilityWhere ?? agedMarketplaceEligibilityWhere;

  const now = new Date("2026-07-27T12:00:00.000Z");

  console.log("\n#82 aged purchase rules — running assertions\n");
  if (prod) console.log("(using PRODUCTION helpers from src/lib/aged/eligibility)\n");
  else console.log("(using reference implementations — set PRODUCTION_IMPORTS=true after #82 lands)\n");

  // --- Regression: existing age-bucket helpers still work ---
  console.log("Existing age-bucket helpers (regression)");
  check("partnerAgedLeadAgeDays ≈ 45 for lead received 45d ago", () => {
    const receivedAt = daysAgo(45);
    const days = partnerAgedLeadAgeDays(receivedAt);
    assert.ok(days >= 44 && days <= 45, `expected ~45, got ${days}`);
  });

  check("30–60 bucket match", () => {
    // Uses Date.now(); keep receivedAt relative to real now
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
    const diffDays =
      (Date.now() - cutoff.getTime()) / (1000 * 60 * 60 * 24);
    assert.ok(diffDays >= 29.5 && diffDays <= 30.5, `got ${diffDays}`);
  });

  check("buildAgedLeadWhereWithCutoff keeps base aged filters", () => {
    const cutoff = new Date("2026-06-27T00:00:00.000Z");
    const where = buildAgedLeadWhereWithCutoff(cutoff);
    assert.deepEqual(where.receivedAt, { lte: cutoff });
    assert.deepEqual(where.status, { not: LeadStatus.dead });
  });

  // --- Next-bracket helper ---
  console.log("\nNext age-bracket boundary");
  check("30–60 day lead → available after receivedAt + 60d", () => {
    const receivedAt = daysAgo(45, now);
    const next = nextBracket(receivedAt, now);
    assert.ok(next, "expected a next bracket date");
    assert.equal(next!.toISOString(), addDays(receivedAt, 60).toISOString());
  });

  check("60–90 day lead → available after receivedAt + 90d", () => {
    const receivedAt = daysAgo(75, now);
    const next = nextBracket(receivedAt, now);
    assert.ok(next, "expected a next bracket date");
    assert.equal(next!.toISOString(), addDays(receivedAt, 90).toISOString());
  });

  check("90+ day lead → no next bracket (null)", () => {
    const receivedAt = daysAgo(120, now);
    assert.equal(nextBracket(receivedAt, now), null);
  });

  check("exactly 60 days old → next is +90d (now in 60–90 bucket)", () => {
    const receivedAt = daysAgo(60, now);
    const next = nextBracket(receivedAt, now);
    assert.ok(next);
    assert.equal(next!.toISOString(), addDays(receivedAt, 90).toISOString());
  });

  // --- Eligibility gate ---
  console.log("\nEligibility (agedSaleCount + agedAvailableAfter)");
  check("never-purchased lead (count=0, after=null) is eligible", () => {
    assert.equal(
      isEligible({ agedSaleCount: 0, agedAvailableAfter: null }, now),
      true,
    );
  });

  check("cooling-off lead (count=1, after in future) is NOT eligible", () => {
    assert.equal(
      isEligible(
        {
          agedSaleCount: 1,
          agedAvailableAfter: addDays(now, 10),
        },
        now,
      ),
      false,
    );
  });

  check("lead past agedAvailableAfter (count=1) is eligible again", () => {
    assert.equal(
      isEligible(
        {
          agedSaleCount: 1,
          agedAvailableAfter: daysAgo(1, now),
        },
        now,
      ),
      true,
    );
  });

  check("second-sale retired lead (count=2) is never eligible", () => {
    assert.equal(
      isEligible(
        {
          agedSaleCount: 2,
          agedAvailableAfter: daysAgo(100, now),
        },
        now,
      ),
      false,
    );
    assert.equal(
      isEligible(
        {
          agedSaleCount: 2,
          agedAvailableAfter: null,
        },
        now,
      ),
      false,
    );
  });

  check("eligibility where clause shape", () => {
    const clause = eligibilityWhere(now);
    assert.deepEqual(clause.agedSaleCount, { lt: 2 });
    assert.ok(Array.isArray(clause.OR));
  });

  // --- Purchase side-effects ---
  console.log("\nPost-purchase field updates");
  check("1st purchase in 30–60: count=1, after=receivedAt+60d", () => {
    const receivedAt = daysAgo(45, now);
    const update = afterSale({ receivedAt, agedSaleCount: 0 }, now);
    assert.equal(update.agedSaleCount, 1);
    assert.equal(
      update.agedAvailableAfter.toISOString(),
      addDays(receivedAt, 60).toISOString(),
    );
  });

  check("1st purchase in 60–90: count=1, after=receivedAt+90d", () => {
    const receivedAt = daysAgo(75, now);
    const update = afterSale({ receivedAt, agedSaleCount: 0 }, now);
    assert.equal(update.agedSaleCount, 1);
    assert.equal(
      update.agedAvailableAfter.toISOString(),
      addDays(receivedAt, 90).toISOString(),
    );
  });

  check("1st purchase in 90+: count=1, after=far-future (no next bracket)", () => {
    const receivedAt = daysAgo(120, now);
    const update = afterSale({ receivedAt, agedSaleCount: 0 }, now);
    assert.equal(update.agedSaleCount, 1);
    assert.equal(
      update.agedAvailableAfter.toISOString(),
      AGED_RETIRED_SENTINEL.toISOString(),
    );
  });

  check("2nd purchase: count=2 and permanently retired", () => {
    const receivedAt = daysAgo(75, now);
    const update = afterSale({ receivedAt, agedSaleCount: 1 }, now);
    assert.equal(update.agedSaleCount, 2);
    assert.equal(
      update.agedAvailableAfter.toISOString(),
      AGED_RETIRED_SENTINEL.toISOString(),
    );
    assert.equal(
      isEligible(
        {
          agedSaleCount: update.agedSaleCount,
          agedAvailableAfter: update.agedAvailableAfter,
        },
        now,
      ),
      false,
    );
  });

  // --- End-to-end marketplace scenarios from the ticket ---
  console.log("\nMarketplace scenarios (Done looks like)");
  check("purchase in 30–60 hides immediately; reappears in 60–90 after aging", () => {
    const receivedAt = daysAgo(45, now);
    const before = {
      receivedAt,
      agedSaleCount: 0,
      agedAvailableAfter: null as Date | null,
    };
    assert.equal(appearsInAgeBucket(before, "30", now), true);

    const update = afterSale(before, now);
    const cooling = {
      receivedAt,
      agedSaleCount: update.agedSaleCount,
      agedAvailableAfter: update.agedAvailableAfter,
    };
    // Hidden from every bucket while cooling off
    assert.equal(appearsInAgeBucket(cooling, "30", now), false);
    assert.equal(appearsInAgeBucket(cooling, "60", now), false);

    // Advance time to just after the 60-day boundary
    const afterBoundary = addDays(receivedAt, 60);
    afterBoundary.setUTCSeconds(afterBoundary.getUTCSeconds() + 1);
    assert.equal(appearsInAgeBucket(cooling, "60", afterBoundary), true);
    assert.equal(appearsInAgeBucket(cooling, "30", afterBoundary), false);
  });

  check("purchase in 60–90 hides; reappears in 90+ after aging past 90d", () => {
    const receivedAt = daysAgo(75, now);
    const update = afterSale(
      { receivedAt, agedSaleCount: 0 },
      now,
    );
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
    const first = afterSale({ receivedAt, agedSaleCount: 0 }, now);
    // Simulate aging into next bracket and second purchase there
    const atNextBracket = addDays(receivedAt, 60);
    atNextBracket.setUTCHours(12, 0, 0, 0);
    const second = afterSale(
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
}

main().catch((err) => {
  console.error("\nFAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
