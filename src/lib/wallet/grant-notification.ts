import { prisma } from "@/lib/db";

const GRANT_BY_SUFFIX = / - by (.+)$/;

export type GrantNotification = {
  id: string;
  amount: number;
  adminName: string | null;
  createdAt: string;
};

/** Partner-facing summary of one or more unacknowledged grants. */
export type AggregatedGrantNotification = {
  ids: string[];
  amount: number;
  adminName: string | null;
  createdAt: string;
};

export function parseGrantDescription(description: string | null | undefined): {
  note: string | null;
  adminName: string | null;
} {
  if (!description?.trim()) {
    return { note: null, adminName: null };
  }

  const trimmed = description.trim();
  const byOnly = /^by (.+)$/.exec(trimmed);
  if (byOnly) {
    return { note: null, adminName: byOnly[1]?.trim() || null };
  }

  const withNote = GRANT_BY_SUFFIX.exec(trimmed);
  if (withNote) {
    const adminName = withNote[1]?.trim() || null;
    const note = trimmed.slice(0, withNote.index).trim() || null;
    return { note, adminName };
  }

  return { note: trimmed, adminName: null };
}

function serializeGrantNotification(row: {
  id: string;
  amount: { toString(): string } | number;
  description: string | null;
  createdAt: Date;
}): GrantNotification {
  const { adminName } = parseGrantDescription(row.description);
  return {
    id: row.id,
    amount: Number(row.amount),
    adminName,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Collapse pending grants into one partner modal: sum amounts; keep admin name
 * only when every grant shares the same non-empty admin.
 */
export function aggregateGrantNotifications(
  notifications: GrantNotification[],
): AggregatedGrantNotification | null {
  if (notifications.length === 0) return null;

  const amount = notifications.reduce((sum, item) => sum + item.amount, 0);
  const adminNames = [
    ...new Set(
      notifications
        .map((item) => item.adminName?.trim() || null)
        .filter((name): name is string => Boolean(name)),
    ),
  ];

  const newest = notifications.reduce((latest, item) =>
    item.createdAt > latest.createdAt ? item : latest,
  );

  return {
    ids: notifications.map((item) => item.id),
    amount,
    adminName: adminNames.length === 1 ? adminNames[0]! : null,
    createdAt: newest.createdAt,
  };
}

export async function getUnacknowledgedGrantNotifications(
  partnerId: string,
): Promise<GrantNotification[]> {
  const rows = await prisma.transaction.findMany({
    where: {
      partnerId,
      type: "admin_grant",
      acknowledgedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      description: true,
      createdAt: true,
    },
  });

  return rows.map(serializeGrantNotification);
}

export async function acknowledgeGrantNotification(
  partnerId: string,
  transactionId: string,
): Promise<
  { ok: true } | { ok: false; code: "not_found" | "already_acknowledged" }
> {
  const transaction = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      partnerId,
      type: "admin_grant",
    },
    select: { id: true, acknowledgedAt: true },
  });

  if (!transaction) {
    return { ok: false, code: "not_found" };
  }

  if (transaction.acknowledgedAt) {
    return { ok: false, code: "already_acknowledged" };
  }

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: { acknowledgedAt: new Date() },
  });

  return { ok: true };
}

/** Acknowledge every listed unacknowledged admin_grant for the partner. */
export async function acknowledgeGrantNotifications(
  partnerId: string,
  transactionIds: string[],
): Promise<{ acknowledged: number }> {
  const uniqueIds = [...new Set(transactionIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { acknowledged: 0 };
  }

  const result = await prisma.transaction.updateMany({
    where: {
      partnerId,
      type: "admin_grant",
      acknowledgedAt: null,
      id: { in: uniqueIds },
    },
    data: { acknowledgedAt: new Date() },
  });

  return { acknowledged: result.count };
}
