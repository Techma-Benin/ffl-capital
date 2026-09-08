import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildAgedLeadWhereWithCutoff } from "../../src/lib/aged/eligibility";
import { partnerLeadStatusWhere } from "../../src/lib/partner/partner-leads-query";

describe("aged hold eligibility", () => {
  test("excludes leads held by another checkout unless that hold expired", () => {
    const cutoff = new Date("2026-01-01T00:00:00.000Z");
    const where = JSON.stringify(buildAgedLeadWhereWithCutoff(cutoff));
    assert.ok(where.includes("agedHoldExpiresAt"));
    assert.equal(where.includes("agedHoldCheckoutId"), false);
  });

  test("allows the checkout that currently holds the lead", () => {
    const cutoff = new Date("2026-01-01T00:00:00.000Z");
    const checkoutId = "11111111-1111-1111-1111-111111111111";
    const where = JSON.stringify(
      buildAgedLeadWhereWithCutoff(cutoff, undefined, {
        heldByCheckoutId: checkoutId,
      }),
    );
    assert.ok(where.includes(checkoutId));
  });

  test("still requires aged marketplace cutoff and sale count", () => {
    const cutoff = new Date("2026-01-01T00:00:00.000Z");
    const where = JSON.stringify(buildAgedLeadWhereWithCutoff(cutoff));
    assert.ok(where.includes("\"lt\":2"));
    assert.ok(where.includes(cutoff.toISOString()));
  });
});

describe("partner lead list hides refunded by default", () => {
  test("empty statuses omit refunded deliveries", () => {
    const where = JSON.stringify(partnerLeadStatusWhere([]));
    assert.ok(where.includes("\"refundedAt\":null"));
    assert.equal(where.includes("\"not\":null"), false);
  });

  test("explicit refunded filter includes refunded deliveries", () => {
    const where = partnerLeadStatusWhere(["refunded"]);
    assert.deepEqual(where, { refundedAt: { not: null } });
  });
});
