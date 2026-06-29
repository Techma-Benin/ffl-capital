import { TransactionType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type TxClient = Prisma.TransactionClient;

export interface LedgerEntryInput {
  partnerId: string;
  type: TransactionType;
  amount: number;
  description?: string;
  stripePaymentIntentId?: string;
  leadDeliveryId?: string;
  tx?: TxClient;
}

/**
 * Append-only wallet ledger. Never update past transactions.
 */
export async function recordLedgerEntry(input: LedgerEntryInput) {
  const client = input.tx ?? prisma;

  const partner = await client.partner.findUniqueOrThrow({
    where: { id: input.partnerId },
  });

  const newBalance = Number(partner.walletBalance) + input.amount;

  if (newBalance < 0) {
    throw new Error("Insufficient wallet balance");
  }

  await client.partner.update({
    where: { id: input.partnerId },
    data: { walletBalance: newBalance },
  });

  return client.transaction.create({
    data: {
      partnerId: input.partnerId,
      type: input.type,
      amount: input.amount,
      balanceAfter: newBalance,
      description: input.description,
      stripePaymentIntentId: input.stripePaymentIntentId,
      leadDeliveryId: input.leadDeliveryId,
    },
  });
}

export async function creditWallet(
  partnerId: string,
  amount: number,
  type: TransactionType,
  options?: Omit<LedgerEntryInput, "partnerId" | "amount" | "type">,
) {
  if (amount <= 0) throw new Error("Credit amount must be positive");
  return recordLedgerEntry({
    partnerId,
    amount,
    type,
    ...options,
  });
}

export async function debitWallet(
  partnerId: string,
  amount: number,
  type: TransactionType,
  options?: Omit<LedgerEntryInput, "partnerId" | "amount" | "type">,
) {
  if (amount <= 0) throw new Error("Debit amount must be positive");
  return recordLedgerEntry({
    partnerId,
    amount: -amount,
    type,
    ...options,
  });
}
