import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  canAcceptAnotherRealtimeSale,
  countNonRefundedRealtimeSales,
  evaluateRealtimeSaleGuard,
  partnerOwnsNonRefundedRealtimeSale,
  realtimeSalesOnLead,
  remainingRealtimeResales,
  uniquePartnerIdsWithNonRefundedRealtimeSale,
} from "../../src/lib/leads/realtime-sale-cap";

describe("realtime sale cap", () => {
  test("counts only non-refunded realtime deliveries", () => {
    const count = countNonRefundedRealtimeSales([
      { partnerId: "a", channel: "realtime", refundedAt: null },
      { partnerId: "b", channel: "realtime", refundedAt: new Date() },
      { partnerId: "c", channel: "aged", refundedAt: null },
    ]);
    assert.equal(count, 1);
  });

  test("lists unique partners with a live realtime copy", () => {
    assert.deepEqual(
      uniquePartnerIdsWithNonRefundedRealtimeSale([
        { partnerId: "p1", channel: "realtime", refundedAt: null },
        { partnerId: "p1", channel: "realtime", refundedAt: null },
        { partnerId: "p2", channel: "realtime", refundedAt: new Date() },
        { partnerId: "p3", channel: "aged", refundedAt: null },
      ]),
      ["p1"],
    );
  });

  test("detects an existing non-refunded realtime sale to the partner", () => {
    assert.equal(
      partnerOwnsNonRefundedRealtimeSale(
        [{ partnerId: "p1", channel: "realtime", refundedAt: null }],
        "p1",
      ),
      true,
    );
    assert.equal(
      partnerOwnsNonRefundedRealtimeSale(
        [{ partnerId: "p1", channel: "realtime", refundedAt: new Date() }],
        "p1",
      ),
      false,
    );
  });

  test("default cap of 1 blocks a second sale", () => {
    assert.equal(canAcceptAnotherRealtimeSale(1, 1), false);
    assert.equal(canAcceptAnotherRealtimeSale(1, 2), true);
    assert.equal(remainingRealtimeResales(1, 1), 0);
    assert.equal(remainingRealtimeResales(1, 2), 1);
  });

  test("counts a delivered lead as already sold even without a realtime row", () => {
    assert.equal(
      realtimeSalesOnLead({ deliveries: [], status: "delivered" }),
      1,
    );
    assert.equal(
      realtimeSalesOnLead({
        deliveries: [{ partnerId: "a", channel: "realtime", refundedAt: null }],
        status: "available",
      }),
      1,
    );
  });

  test("blocks dead, review, duplicate partner, and cap", () => {
    assert.equal(
      evaluateRealtimeSaleGuard({
        status: "dead",
        leadType: "cage",
        categoryResolution: "matched",
        maxRealtimeSells: 2,
        soldCount: 0,
        alreadySoldToPartner: false,
      }).ok,
      false,
    );
    assert.equal(
      evaluateRealtimeSaleGuard({
        status: "delivered",
        leadType: "cage",
        categoryResolution: "matched",
        maxRealtimeSells: 2,
        soldCount: 1,
        alreadySoldToPartner: true,
      }).ok,
      false,
    );
    const cap = evaluateRealtimeSaleGuard({
      status: "delivered",
      leadType: "cage",
      categoryResolution: "matched",
      maxRealtimeSells: 1,
      soldCount: 1,
      alreadySoldToPartner: false,
    });
    assert.equal(cap.ok, false);
    if (!cap.ok) {
      assert.equal(cap.code, "sale_cap");
      assert.match(cap.message, /no remaining resales/);
    }
    assert.equal(
      evaluateRealtimeSaleGuard({
        status: "delivered",
        leadType: "cage",
        categoryResolution: "matched",
        maxRealtimeSells: 2,
        soldCount: 1,
        alreadySoldToPartner: false,
      }).ok,
      true,
    );
    const soldUnmatched = evaluateRealtimeSaleGuard({
      status: "delivered",
      leadType: "cage",
      categoryResolution: "no_match",
      maxRealtimeSells: 1,
      soldCount: 1,
      alreadySoldToPartner: false,
    });
    assert.equal(soldUnmatched.ok, false);
    if (!soldUnmatched.ok) assert.equal(soldUnmatched.code, "sale_cap");
  });
});
