import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { formatLeadStatusLabel } from "@/lib/leads/lead-status-label";

describe("formatLeadStatusLabel", () => {
  test("distinguishes Integrity RealTime vs Storefront", () => {
    assert.equal(
      formatLeadStatusLabel("integrity_posted", "integrity_realtime"),
      "Integrity · RealTime",
    );
    assert.equal(
      formatLeadStatusLabel("integrity_posted", "integrity_storefront"),
      "Integrity · Storefront",
    );
  });

  test("falls back to Integrity when destination unknown", () => {
    assert.equal(formatLeadStatusLabel("integrity_posted"), "Integrity");
    assert.equal(formatLeadStatusLabel("integrity_posted", null), "Integrity");
    assert.equal(formatLeadStatusLabel("integrity_posted", "partner"), "Integrity");
  });

  test("leaves other statuses unchanged", () => {
    assert.equal(formatLeadStatusLabel("delivered"), "Delivered");
    assert.equal(formatLeadStatusLabel("unmatched"), "Unmatched");
  });
});
