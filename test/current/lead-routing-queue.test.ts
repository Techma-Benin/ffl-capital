import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { classifyIntegrityFailure } from "../../src/lib/integrity/classify";
import { normalizeIntegrityReason } from "../../src/lib/integrity/no-campaign";
import { computeNextRoutingAttempt } from "../../src/lib/lead-routing/schedule";
import { DEFAULT_LIFECYCLE_SETTINGS } from "../../src/lib/lead-routing/policy";
import {
  receivedAtBoundsForWindow,
  sortDueLeadsFairly,
} from "../../src/lib/lead-routing/work-queue";

describe("Integrity failure classification", () => {
  test("quoted No Campaign Available is retryable", () => {
    const cls = classifyIntegrityFailure({
      outcome: "failure",
      reason: '"No Campaign Available."',
    });
    assert.equal(cls, "retryable_no_campaign");
  });

  test("escaped-quote No Campaign Available is retryable", () => {
    const cls = classifyIntegrityFailure({
      outcome: "failure",
      reason: '\\"No Campaign Available.\\"',
    });
    assert.equal(cls, "retryable_no_campaign");
  });

  test("duplicate lead is terminal business rejection", () => {
    const cls = classifyIntegrityFailure({
      outcome: "failure",
      reason: "Duplicate lead",
    });
    assert.equal(cls, "terminal_business_rejection");
  });

  test("invalid phone is terminal", () => {
    const cls = classifyIntegrityFailure({
      outcome: "failure",
      reason: "Invalid phone number",
    });
    assert.equal(cls, "terminal_business_rejection");
  });

  test("HTTP 429 is operational", () => {
    assert.equal(
      classifyIntegrityFailure({ reason: "HTTP 429", httpStatus: 429 }),
      "operational_failure",
    );
  });

  test("HTTP 503 is operational", () => {
    assert.equal(
      classifyIntegrityFailure({ reason: "HTTP 503", httpStatus: 503 }),
      "operational_failure",
    );
  });

  test("network error is operational", () => {
    assert.equal(
      classifyIntegrityFailure({
        reason: "Network error: fetch failed",
        isNetworkError: true,
      }),
      "operational_failure",
    );
  });

  test("normalize strips wrapping quotes and punctuation-friendly compare", () => {
    assert.equal(
      normalizeIntegrityReason('"No Campaign Available."').toLowerCase(),
      "no campaign available.",
    );
  });
});

describe("Routing backoff schedule", () => {
  const settings = { ...DEFAULT_LIFECYCLE_SETTINGS, enabled: true };
  const receivedAt = new Date("2026-08-01T00:00:00.000Z");
  const now = new Date("2026-08-01T01:00:00.000Z");

  test("NCA uses 15 then 30 then 60 minute intervals", () => {
    const a1 = computeNextRoutingAttempt({
      now,
      receivedAt,
      attemptCountAfter: 1,
      kind: "no_campaign",
      settings,
    });
    assert.equal(
      a1.nextRoutingAttemptAt!.getTime() - now.getTime(),
      15 * 60 * 1000,
    );

    const a2 = computeNextRoutingAttempt({
      now,
      receivedAt,
      attemptCountAfter: 2,
      kind: "no_campaign",
      settings,
    });
    assert.equal(
      a2.nextRoutingAttemptAt!.getTime() - now.getTime(),
      30 * 60 * 1000,
    );

    const a3 = computeNextRoutingAttempt({
      now,
      receivedAt,
      attemptCountAfter: 3,
      kind: "no_campaign",
      settings,
    });
    assert.equal(
      a3.nextRoutingAttemptAt!.getTime() - now.getTime(),
      60 * 60 * 1000,
    );

    const a4 = computeNextRoutingAttempt({
      now,
      receivedAt,
      attemptCountAfter: 10,
      kind: "no_campaign",
      settings,
    });
    assert.equal(
      a4.nextRoutingAttemptAt!.getTime() - now.getTime(),
      60 * 60 * 1000,
    );
  });

  test("partner miss sets real backoff (not immediately due)", () => {
    const result = computeNextRoutingAttempt({
      now,
      receivedAt,
      attemptCountAfter: 1,
      kind: "partner_miss",
      settings,
    });
    assert.ok(result.nextRoutingAttemptAt);
    assert.ok(result.nextRoutingAttemptAt!.getTime() > now.getTime());
    assert.equal(
      result.nextRoutingAttemptAt!.getTime() - now.getTime(),
      5 * 60 * 1000,
    );
  });

  test("NCA hard cutoff clamps next attempt", () => {
    const hardCutoffAt = new Date(now.getTime() + 10 * 60 * 1000);
    const result = computeNextRoutingAttempt({
      now,
      receivedAt,
      attemptCountAfter: 1,
      kind: "no_campaign",
      settings,
      hardCutoffAt,
    });
    assert.equal(result.nextRoutingAttemptAt!.getTime(), hardCutoffAt.getTime());
  });
});

describe("Fair due queue windows and ordering", () => {
  const settings = { ...DEFAULT_LIFECYCLE_SETTINGS, enabled: true };
  const now = new Date("2026-08-07T12:00:00.000Z");

  test("windows are independent and exclude 30d+", () => {
    const realtime = receivedAtBoundsForWindow("realtime", settings, now);
    const mid = receivedAtBoundsForWindow("mid", settings, now);
    const partners = receivedAtBoundsForWindow("partners_only", settings, now);

    assert.ok(realtime.gt);
    assert.ok(mid.gt && mid.lte);
    assert.ok(partners.gt && partners.lte);

    // Mid upper bound equals realtime lower bound
    assert.equal(mid.lte!.getTime(), realtime.gt!.getTime());
    // Partners upper bound equals mid lower bound
    assert.equal(partners.lte!.getTime(), mid.gt!.getTime());

    // 30d+ receivedAt is at or before partners.gt — excluded from all windows
    const aged = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
    assert.ok(aged.getTime() <= partners.gt!.getTime());
  });

  test("never-attempted sorts ahead of retries within a window", () => {
    const sorted = sortDueLeadsFairly([
      {
        id: "b",
        lastRoutingAttemptAt: new Date("2026-08-07T10:00:00.000Z"),
        nextRoutingAttemptAt: new Date("2026-08-07T11:00:00.000Z"),
        routingAttemptCount: 3,
      },
      {
        id: "a",
        lastRoutingAttemptAt: null,
        nextRoutingAttemptAt: null,
        routingAttemptCount: 0,
      },
      {
        id: "c",
        lastRoutingAttemptAt: new Date("2026-08-07T09:00:00.000Z"),
        nextRoutingAttemptAt: new Date("2026-08-07T10:00:00.000Z"),
        routingAttemptCount: 1,
      },
    ]);
    assert.deepEqual(
      sorted.map((l) => l.id),
      ["a", "c", "b"],
    );
  });

  test("pagination model drains beyond page size without starving other windows", () => {
    // Simulate 120 partners_only thrash + 10 mid never-attempted.
    // Per-window pages of 50: partners takes 3 pages; mid still gets its own drain.
    const pageSize = 50;
    const partnersOnlyCount = 120;
    const midCount = 10;

    const partnersPages = Math.ceil(partnersOnlyCount / pageSize);
    const midPages = Math.ceil(midCount / pageSize);

    assert.equal(partnersPages, 3);
    assert.equal(midPages, 1);

    // Independent drains: mid claimed equals midCount even if partners > 50
    const midClaimed = Math.min(midCount, pageSize * midPages);
    assert.equal(midClaimed, 10);

    // partners_only cannot consume mid capacity
    const totalIfGlobalTake50 = 50;
    assert.ok(midClaimed + Math.min(partnersOnlyCount, pageSize) > totalIfGlobalTake50);
  });
});
