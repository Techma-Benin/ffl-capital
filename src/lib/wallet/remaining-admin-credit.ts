import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type LedgerClient = {
  transaction: {
    findMany: typeof prisma.transaction.findMany;
  };
};

const SPEND_TYPES = new Set([
  "lead_purchase",
  "aged_purchase",
  "reprocessing_fee",
]);

export type AdminCreditLedgerEntry = {
  type: string;
  amount: number;
  leadDeliveryId?: string | null;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Unused admin credit still sitting in the wallet.
 * Replay grants/spends/refunds/clawbacks in time order; grants are spent before deposits.
 */
export function remainingUnusedAdminCredit(
  entries: AdminCreditLedgerEntry[],
  walletBalance: number,
): number {
  let envelope = 0;
  const creditTakenByDelivery = new Map<string, number>();

  for (const entry of entries) {
    const amount = Number(entry.amount);
    if (!Number.isFinite(amount) || amount === 0) continue;

    if (entry.type === "admin_grant") {
      envelope = roundMoney(envelope + amount);
      continue;
    }

    if (entry.type === "admin_debit") {
      envelope = roundMoney(Math.max(0, envelope - Math.abs(amount)));
      continue;
    }

    if (SPEND_TYPES.has(entry.type)) {
      const fromCredit = roundMoney(Math.min(envelope, Math.abs(amount)));
      envelope = roundMoney(envelope - fromCredit);
      const deliveryId = entry.leadDeliveryId;
      if (deliveryId && fromCredit > 0) {
        creditTakenByDelivery.set(
          deliveryId,
          roundMoney((creditTakenByDelivery.get(deliveryId) ?? 0) + fromCredit),
        );
      }
      continue;
    }

    if (entry.type === "refund") {
      const deliveryId = entry.leadDeliveryId;
      if (!deliveryId) continue;
      const taken = creditTakenByDelivery.get(deliveryId) ?? 0;
      const restore = roundMoney(Math.min(taken, Math.abs(amount)));
      envelope = roundMoney(envelope + restore);
      creditTakenByDelivery.set(deliveryId, roundMoney(taken - restore));
    }
  }

  return roundMoney(
    Math.min(Math.max(0, envelope), Math.max(0, walletBalance)),
  );
}

export async function getRemainingUnusedAdminCredit(
  partnerId: string,
  walletBalance: number,
  client: LedgerClient | Prisma.TransactionClient = prisma,
): Promise<number> {
  const rows = await client.transaction.findMany({
    where: { partnerId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { type: true, amount: true, leadDeliveryId: true },
  });

  return remainingUnusedAdminCredit(
    rows.map((row) => ({
      type: row.type,
      amount: Number(row.amount),
      leadDeliveryId: row.leadDeliveryId,
    })),
    walletBalance,
  );
}
