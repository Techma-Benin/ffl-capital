import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type LedgerClient = {
  transaction: {
    groupBy: typeof prisma.transaction.groupBy;
  };
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumByType(
  grouped: Array<{ type: string; _sum: { amount: number | null } }>,
  type: string,
): number {
  return Number(grouped.find((row) => row.type === type)?._sum.amount ?? 0);
}

/**
 * Unused admin credit still sitting in the wallet.
 * Admin grants are consumed before deposits; clawbacks only return unused grants.
 */
export function remainingUnusedAdminCredit(input: {
  grantTotal: number;
  clawbackTotal: number;
  netSpend: number;
  walletBalance: number;
}): number {
  const unusedGranted = roundMoney(
    Math.max(
      0,
      input.grantTotal - input.clawbackTotal - Math.max(0, input.netSpend),
    ),
  );
  return roundMoney(Math.min(unusedGranted, Math.max(0, input.walletBalance)));
}

export async function getRemainingUnusedAdminCredit(
  partnerId: string,
  walletBalance: number,
  client: LedgerClient | Prisma.TransactionClient = prisma,
): Promise<number> {
  const grouped = await client.transaction.groupBy({
    by: ["type"],
    where: { partnerId },
    _sum: { amount: true },
  });

  const grantTotal = sumByType(grouped, "admin_grant");
  const clawbackTotal = Math.abs(sumByType(grouped, "admin_debit"));
  const purchaseOutflow = -(
    sumByType(grouped, "lead_purchase") +
    sumByType(grouped, "aged_purchase") +
    sumByType(grouped, "reprocessing_fee")
  );
  const refunds = sumByType(grouped, "refund");
  const netSpend = roundMoney(purchaseOutflow - refunds);

  return remainingUnusedAdminCredit({
    grantTotal,
    clawbackTotal,
    netSpend,
    walletBalance,
  });
}
