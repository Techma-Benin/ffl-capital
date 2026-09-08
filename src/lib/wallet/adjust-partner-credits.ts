import type { User } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { sendResendEmail } from "@/lib/email/send-resend-email";
import {
  buildPartnerCreditAdjustEmail,
  type PartnerCreditAdjustPartner,
} from "@/lib/email/partner-credit-adjust-email";
import { debitWallet } from "@/lib/wallet/ledger";
import {
  buildGrantDescription,
  getAdminIdentityFromUser,
  validateGrantNote,
} from "@/lib/wallet/grant-partner-credits";
import { getRemainingUnusedAdminCredit } from "@/lib/wallet/remaining-admin-credit";

export class AdjustPartnerCreditsError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "not_found"
      | "inactive"
      | "invalid_amount"
      | "no_unused_credit"
      | "exceeds_unused_credit",
  ) {
    super(message);
    this.name = "AdjustPartnerCreditsError";
  }
}

export type CreditAdjustMode = "reduce" | "zero";

export function resolveCreditAdjustAmount(input: {
  mode: CreditAdjustMode;
  amount?: number;
  remainingUnusedCredit: number;
}): number {
  const remaining = Number(input.remainingUnusedCredit);
  if (!Number.isFinite(remaining) || remaining < 0) {
    throw new AdjustPartnerCreditsError(
      "Invalid unused credit amount",
      "invalid_amount",
    );
  }

  if (remaining <= 0) {
    throw new AdjustPartnerCreditsError(
      "No unused admin credit to remove",
      "no_unused_credit",
    );
  }

  if (input.mode === "zero") {
    return roundMoney(remaining);
  }

  const amount = input.amount;
  if (!Number.isFinite(amount) || amount === undefined || amount <= 0) {
    throw new AdjustPartnerCreditsError(
      "Amount must be greater than zero",
      "invalid_amount",
    );
  }

  const rounded = roundMoney(amount);
  if (rounded <= 0) {
    throw new AdjustPartnerCreditsError(
      "Amount must be at least $0.01",
      "invalid_amount",
    );
  }

  if (rounded > remaining) {
    throw new AdjustPartnerCreditsError(
      "Amount cannot exceed unused admin credit",
      "exceeds_unused_credit",
    );
  }

  return rounded;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export type AdjustPartnerCreditsInput = {
  partnerId: string;
  mode: CreditAdjustMode;
  amount?: number;
  note: string;
  adminUser: User;
  walletUrl?: string;
  appOrigin?: string;
};

export type AdjustPartnerCreditsResult = {
  transaction: { id: string; amount: number; balanceAfter: number };
  newBalance: number;
  removed: number;
  emailSent: boolean;
  emailWarning?: string;
};

export type AdjustPartnerCreditsDeps = {
  sendEmail?: typeof sendResendEmail;
  debitWalletFn?: typeof debitWallet;
  remainingUnusedCreditFn?: typeof getRemainingUnusedAdminCredit;
};

export async function adjustPartnerCredits(
  input: AdjustPartnerCreditsInput,
  deps: AdjustPartnerCreditsDeps = {},
): Promise<AdjustPartnerCreditsResult> {
  const sendEmail = deps.sendEmail ?? sendResendEmail;
  const debitWalletFn = deps.debitWalletFn ?? debitWallet;
  const remainingUnusedCreditFn =
    deps.remainingUnusedCreditFn ?? getRemainingUnusedAdminCredit;

  const trimmedNote = validateGrantNote(input.note);

  const partner = await prisma.partner.findUnique({
    where: { id: input.partnerId },
  });

  if (!partner) {
    throw new AdjustPartnerCreditsError("Partner not found", "not_found");
  }

  if (partner.status !== "active") {
    throw new AdjustPartnerCreditsError(
      "Credits can only be adjusted for active partners",
      "inactive",
    );
  }

  const remainingUnusedCredit = await remainingUnusedCreditFn(
    input.partnerId,
    Number(partner.walletBalance),
  );
  const removed = resolveCreditAdjustAmount({
    mode: input.mode,
    amount: input.amount,
    remainingUnusedCredit,
  });

  const { displayName } = getAdminIdentityFromUser(input.adminUser);
  const description = buildGrantDescription(displayName, "", trimmedNote);

  const transaction = await debitWalletFn(
    input.partnerId,
    removed,
    "admin_debit",
    { description },
  );

  const newBalance = Number(transaction.balanceAfter);
  const partnerForEmail: PartnerCreditAdjustPartner = {
    firstName: partner.firstName,
    lastName: partner.lastName,
    email: partner.email,
  };

  const emailContent = buildPartnerCreditAdjustEmail({
    partner: partnerForEmail,
    amount: removed,
    zeroed: newBalance === 0,
    walletUrl: input.walletUrl,
    appOrigin: input.appOrigin,
  });

  const emailResult = await sendEmail({
    to: partner.email,
    subject: emailContent.subject,
    html: emailContent.html,
  });

  if (!emailResult.sent) {
    console.error("[partner-credit-adjust] partner email failed", {
      error: emailResult.error,
      partnerId: input.partnerId,
    });
    return {
      transaction: {
        id: transaction.id,
        amount: Number(transaction.amount),
        balanceAfter: newBalance,
      },
      newBalance,
      removed,
      emailSent: false,
      emailWarning:
        "Credits were updated, but we could not email the partner about this change.",
    };
  }

  return {
    transaction: {
      id: transaction.id,
      amount: Number(transaction.amount),
      balanceAfter: newBalance,
    },
    newBalance,
    removed,
    emailSent: true,
  };
}
