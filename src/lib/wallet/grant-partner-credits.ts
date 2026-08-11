import type { User } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { sendResendEmail } from "@/lib/email/send-resend-email";
import {
  buildPartnerCreditGrantEmail,
  type PartnerCreditGrantPartner,
} from "@/lib/email/partner-credit-grant-email";
import { creditWallet } from "@/lib/wallet/ledger";

export const FUNDING_TRANSACTION_TYPES = ["top_up", "admin_grant"] as const;

const ADMIN_GRANT_MIN = 0.01;
const ADMIN_GRANT_MAX = 1000;

export class GrantPartnerCreditsError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "not_found"
      | "inactive"
      | "invalid_amount"
      | "invalid_note",
  ) {
    super(message);
    this.name = "GrantPartnerCreditsError";
  }
}

export function validateGrantAmount(amount: number, isSuperAdmin: boolean): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new GrantPartnerCreditsError(
      "Amount must be greater than zero",
      "invalid_amount",
    );
  }

  if (!isSuperAdmin) {
    if (amount < ADMIN_GRANT_MIN) {
      throw new GrantPartnerCreditsError(
        `Amount must be at least $${ADMIN_GRANT_MIN.toFixed(2)}`,
        "invalid_amount",
      );
    }
    if (amount > ADMIN_GRANT_MAX) {
      throw new GrantPartnerCreditsError(
        `Amount cannot exceed $${ADMIN_GRANT_MAX.toFixed(2)}`,
        "invalid_amount",
      );
    }
  }
}

export function validateGrantNote(note: string): string {
  return note.trim();
}

export function buildGrantDescription(
  adminName: string,
  _adminEmail: string,
  note: string,
): string {
  const trimmed = note.trim();
  if (trimmed) {
    return `${trimmed} - by ${adminName}`;
  }
  return `by ${adminName}`;
}

export function getAdminIdentityFromUser(user: User): {
  displayName: string;
  email: string;
} {
  const firstName = user.firstName?.trim() ?? "";
  const lastName = user.lastName?.trim() ?? "";
  const displayName = `${firstName} ${lastName}`.trim() || "Admin";
  const email =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    "";

  return { displayName, email };
}

export type GrantPartnerCreditsInput = {
  partnerId: string;
  amount: number;
  note: string;
  adminUser: User;
  isSuperAdmin: boolean;
  /** Absolute wallet URL, or app origin used to build `/partner/wallet`. */
  walletUrl?: string;
  appOrigin?: string;
};

export type GrantPartnerCreditsResult = {
  transaction: { id: string; amount: number; balanceAfter: number };
  newBalance: number;
  emailSent: boolean;
  emailWarning?: string;
};

export type GrantPartnerCreditsDeps = {
  sendEmail?: typeof sendResendEmail;
  creditWalletFn?: typeof creditWallet;
};

export async function grantPartnerCredits(
  input: GrantPartnerCreditsInput,
  deps: GrantPartnerCreditsDeps = {},
): Promise<GrantPartnerCreditsResult> {
  const sendEmail = deps.sendEmail ?? sendResendEmail;
  const creditWalletFn = deps.creditWalletFn ?? creditWallet;

  const trimmedNote = validateGrantNote(input.note);
  validateGrantAmount(input.amount, input.isSuperAdmin);

  const partner = await prisma.partner.findUnique({
    where: { id: input.partnerId },
  });

  if (!partner) {
    throw new GrantPartnerCreditsError("Partner not found", "not_found");
  }

  if (partner.status !== "active") {
    throw new GrantPartnerCreditsError(
      "Credits can only be granted to active partners",
      "inactive",
    );
  }

  const { displayName, email: adminEmail } = getAdminIdentityFromUser(
    input.adminUser,
  );
  const description = buildGrantDescription(
    displayName,
    adminEmail,
    trimmedNote,
  );

  const transaction = await creditWalletFn(
    input.partnerId,
    input.amount,
    "admin_grant",
    { description },
  );

  const newBalance = Number(transaction.balanceAfter);
  const partnerForEmail: PartnerCreditGrantPartner = {
    firstName: partner.firstName,
    lastName: partner.lastName,
    email: partner.email,
  };

  const emailContent = buildPartnerCreditGrantEmail({
    partner: partnerForEmail,
    amount: input.amount,
    walletUrl: input.walletUrl,
    appOrigin: input.appOrigin,
  });

  const emailResult = await sendEmail({
    to: partner.email,
    subject: emailContent.subject,
    html: emailContent.html,
  });

  if (!emailResult.sent) {
    console.error("[partner-credit-grant] partner email failed", {
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
      emailSent: false,
      emailWarning:
        "Credits were added, but we could not email the partner about this grant.",
    };
  }

  return {
    transaction: {
      id: transaction.id,
      amount: Number(transaction.amount),
      balanceAfter: newBalance,
    },
    newBalance,
    emailSent: true,
  };
}
