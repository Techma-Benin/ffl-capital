import { prisma } from "@/lib/db";

const GRANT_BY_SUFFIX = / - by (.+)$/;

export type GrantNotification = {
  id: string;
  amount: number;
  balanceAfter: number;
  note: string | null;
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
  balanceAfter: { toString(): string } | number;
  description: string | null;
  createdAt: Date;
}): GrantNotification {
  const { note, adminName } = parseGrantDescription(row.description);
  return {
    id: row.id,
    amount: Number(row.amount),
    balanceAfter: Number(row.balanceAfter),
    note,
    adminName,
    createdAt: row.createdAt.toISOString(),
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
      balanceAfter: true,
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
    where: { id: transactionId },
    data: { acknowledgedAt: new Date() },
  });

  return { ok: true };
}
