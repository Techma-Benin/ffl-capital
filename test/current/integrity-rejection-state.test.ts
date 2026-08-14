import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ResaleMode } from "@prisma/client";
import {
  hasIntegrityTerminalRejection,
  resolveIntegrityModeRejections,
} from "../../src/lib/integrity/rejection-state";

describe("Integrity mode rejection state", () => {
  const postings = [
    { id: "realtime-posting", mode: ResaleMode.realtime },
    { id: "storefront-posting", mode: ResaleMode.storefront },
  ];

  test("a Realtime rejection does not block Storefront", () => {
    const result = resolveIntegrityModeRejections(postings, [
      { payload: { postingId: "realtime-posting" } },
    ]);

    assert.deepEqual(result, { realtime: true, storefront: false });
    assert.equal(hasIntegrityTerminalRejection(result), true);
  });

  test("both modes block only after each has a terminal rejection", () => {
    const result = resolveIntegrityModeRejections(postings, [
      { payload: { postingId: "realtime-posting" } },
      { payload: { postingId: "storefront-posting" } },
    ]);

    assert.deepEqual(result, { realtime: true, storefront: true });
  });

  test("supports webhook mode payload when a posting lookup is unavailable", () => {
    const result = resolveIntegrityModeRejections([], [
      { payload: { mode: ResaleMode.storefront } },
    ]);

    assert.deepEqual(result, { realtime: false, storefront: true });
  });

  test("does not treat retryable or operational events as terminal", () => {
    const result = resolveIntegrityModeRejections(postings, [
      {
        payload: {
          postingId: "realtime-posting",
          failureClass: "retryable_no_campaign",
        },
      },
      {
        payload: {
          postingId: "storefront-posting",
          failureClass: "operational_failure",
        },
      },
    ]);

    assert.deepEqual(result, { realtime: false, storefront: false });
  });
});
