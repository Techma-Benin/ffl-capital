import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  acknowledgeGrantNotification,
  acknowledgeGrantNotifications,
  aggregateGrantNotifications,
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

describe("aggregateGrantNotifications", () => {
  test("returns null for empty list", () => {
    assert.equal(aggregateGrantNotifications([]), null);
  });

  test("sums amounts and keeps shared admin name", () => {
    const aggregated = aggregateGrantNotifications([
      {
        id: "tx_1",
        amount: 30,
        adminName: "Admin",
        createdAt: "2026-08-10T10:00:00.000Z",
      },
      {
        id: "tx_2",
        amount: 20,
        adminName: "Admin",
        createdAt: "2026-08-11T10:00:00.000Z",
      },
    ]);

    assert.deepEqual(aggregated, {
      ids: ["tx_1", "tx_2"],
      amount: 50,
      adminName: "Admin",
      createdAt: "2026-08-11T10:00:00.000Z",
    });
  });

  test("drops admin name when grants come from different admins", () => {
    const aggregated = aggregateGrantNotifications([
      {
        id: "tx_1",
        amount: 10,
        adminName: "Ada",
        createdAt: "2026-08-10T10:00:00.000Z",
      },
      {
        id: "tx_2",
        amount: 5,
        adminName: "Grace",
        createdAt: "2026-08-09T10:00:00.000Z",
      },
    ]);

    assert.equal(aggregated?.amount, 15);
    assert.equal(aggregated?.adminName, null);
    assert.equal(aggregated?.createdAt, "2026-08-10T10:00:00.000Z");
  });
});

describe("grant notification queries", () => {
  test("getUnacknowledgedGrantNotifications maps rows without note or balance", async () => {
    const { prisma } = await import("../../src/lib/db");
    const originalFindMany = prisma.transaction.findMany;
    const createdAt = new Date("2026-08-10T12:00:00.000Z");

    prisma.transaction.findMany = async () =>
      [
        {
          id: "tx_1",
          amount: 50,
          description: "Welcome bonus - by Jane Admin",
          createdAt,
        },
      ] as Awaited<ReturnType<typeof originalFindMany>>;

    try {
      const notifications = await getUnacknowledgedGrantNotifications("partner_1");
      assert.equal(notifications.length, 1);
      assert.equal(notifications[0]?.id, "tx_1");
      assert.equal(notifications[0]?.amount, 50);
      assert.equal(notifications[0]?.adminName, "Jane Admin");
      assert.equal(notifications[0]?.createdAt, createdAt.toISOString());
      assert.equal(
        Object.prototype.hasOwnProperty.call(notifications[0], "note"),
        false,
      );
      assert.equal(
        Object.prototype.hasOwnProperty.call(notifications[0], "balanceAfter"),
        false,
      );
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

  test("acknowledgeGrantNotifications bulk-updates pending grants", async () => {
    const { prisma } = await import("../../src/lib/db");
    const originalUpdateMany = prisma.transaction.updateMany;

    prisma.transaction.updateMany = async () => ({ count: 2 });

    try {
      const result = await acknowledgeGrantNotifications("partner_1", [
        "tx_1",
        "tx_2",
        "tx_1",
      ]);
      assert.equal(result.acknowledged, 2);
    } finally {
      prisma.transaction.updateMany = originalUpdateMany;
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
