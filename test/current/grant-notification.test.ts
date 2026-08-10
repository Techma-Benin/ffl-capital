import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  acknowledgeGrantNotification,
  getUnacknowledgedGrantNotifications,
  parseGrantDescription,
} from "../../src/lib/wallet/grant-notification";

describe("parseGrantDescription", () => {
  test("parses note and admin name", () => {
    assert.deepEqual(
      parseGrantDescription("Promotional credit - by Jane Admin"),
      { note: "Promotional credit", adminName: "Jane Admin" },
    );
  });

  test("parses admin name only when note is blank", () => {
    assert.deepEqual(parseGrantDescription("by Jane Admin"), {
      note: null,
      adminName: "Jane Admin",
    });
  });

  test("returns nulls for empty description", () => {
    assert.deepEqual(parseGrantDescription(null), {
      note: null,
      adminName: null,
    });
    assert.deepEqual(parseGrantDescription("   "), {
      note: null,
      adminName: null,
    });
  });

  test("treats unmatched text as note only", () => {
    assert.deepEqual(parseGrantDescription("Legacy grant description"), {
      note: "Legacy grant description",
      adminName: null,
    });
  });
});

describe("grant notification queries", () => {
  test("getUnacknowledgedGrantNotifications maps rows", async () => {
    const { prisma } = await import("../../src/lib/db");
    const originalFindMany = prisma.transaction.findMany;
    const createdAt = new Date("2026-08-10T12:00:00.000Z");

    prisma.transaction.findMany = async () =>
      [
        {
          id: "tx_1",
          amount: 50,
          balanceAfter: 150,
          description: "Welcome bonus - by Jane Admin",
          createdAt,
        },
      ] as Awaited<ReturnType<typeof originalFindMany>>;

    try {
      const notifications = await getUnacknowledgedGrantNotifications("partner_1");
      assert.equal(notifications.length, 1);
      assert.equal(notifications[0]?.id, "tx_1");
      assert.equal(notifications[0]?.amount, 50);
      assert.equal(notifications[0]?.balanceAfter, 150);
      assert.equal(notifications[0]?.note, "Welcome bonus");
      assert.equal(notifications[0]?.adminName, "Jane Admin");
      assert.equal(notifications[0]?.createdAt, createdAt.toISOString());
    } finally {
      prisma.transaction.findMany = originalFindMany;
    }
  });

  test("acknowledgeGrantNotification updates unacknowledged grant", async () => {
    const { prisma } = await import("../../src/lib/db");
    const originalFindFirst = prisma.transaction.findFirst;
    const originalUpdate = prisma.transaction.update;

    let updated = false;

    prisma.transaction.findFirst = async () =>
      ({
        id: "tx_1",
        acknowledgedAt: null,
      }) as Awaited<ReturnType<typeof originalFindFirst>>;

    prisma.transaction.update = async () => {
      updated = true;
      return {} as Awaited<ReturnType<typeof originalUpdate>>;
    };

    try {
      const result = await acknowledgeGrantNotification("partner_1", "tx_1");
      assert.equal(result.ok, true);
      assert.equal(updated, true);
    } finally {
      prisma.transaction.findFirst = originalFindFirst;
      prisma.transaction.update = originalUpdate;
    }
  });

  test("acknowledgeGrantNotification rejects missing grant", async () => {
    const { prisma } = await import("../../src/lib/db");
    const originalFindFirst = prisma.transaction.findFirst;
    prisma.transaction.findFirst = async () => null;

    try {
      const result = await acknowledgeGrantNotification("partner_1", "missing");
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.code, "not_found");
      }
    } finally {
      prisma.transaction.findFirst = originalFindFirst;
    }
  });

  test("acknowledgeGrantNotification rejects already acknowledged grant", async () => {
    const { prisma } = await import("../../src/lib/db");
    const originalFindFirst = prisma.transaction.findFirst;
    prisma.transaction.findFirst = async () =>
      ({
        id: "tx_1",
        acknowledgedAt: new Date(),
      }) as Awaited<ReturnType<typeof originalFindFirst>>;

    try {
      const result = await acknowledgeGrantNotification("partner_1", "tx_1");
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.code, "already_acknowledged");
      }
    } finally {
      prisma.transaction.findFirst = originalFindFirst;
    }
  });
});
