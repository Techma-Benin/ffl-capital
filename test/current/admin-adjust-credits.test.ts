import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildPartnerCreditAdjustEmail } from "../../src/lib/email/partner-credit-adjust-email";
import {
  AdjustPartnerCreditsError,
  adjustPartnerCredits,
  resolveCreditAdjustAmount,
} from "../../src/lib/wallet/adjust-partner-credits";
import type { SendResendEmailParams } from "../../src/lib/email/send-resend-email";

const mockAdminUser = {
  id: "user_admin",
  firstName: "Jane",
  lastName: "Admin",
  primaryEmailAddressId: "email_1",
  emailAddresses: [{ id: "email_1", emailAddress: "admin@fflcapital.com" }],
} as import("@clerk/nextjs/server").User;

const activePartner = {
  id: "partner_1",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "partner@example.com",
  status: "active" as const,
  walletBalance: 6,
};

describe("resolveCreditAdjustAmount", () => {
  test("zero uses the full current balance", () => {
    assert.equal(
      resolveCreditAdjustAmount({ mode: "zero", currentBalance: 6 }),
      6,
    );
  });

  test("rejects zero when balance is already 0", () => {
    assert.throws(
      () => resolveCreditAdjustAmount({ mode: "zero", currentBalance: 0 }),
      (err: unknown) =>
        err instanceof AdjustPartnerCreditsError && err.code === "already_zero",
    );
  });

  test("reduce cannot exceed balance or go negative", () => {
    assert.throws(
      () =>
        resolveCreditAdjustAmount({
          mode: "reduce",
          amount: 10,
          currentBalance: 6,
        }),
      (err: unknown) =>
        err instanceof AdjustPartnerCreditsError &&
        err.code === "exceeds_balance",
    );
    assert.throws(
      () =>
        resolveCreditAdjustAmount({
          mode: "reduce",
          amount: 0,
          currentBalance: 6,
        }),
      (err: unknown) =>
        err instanceof AdjustPartnerCreditsError &&
        err.code === "invalid_amount",
    );
  });

  test("reduce returns the requested amount when within balance", () => {
    assert.equal(
      resolveCreditAdjustAmount({
        mode: "reduce",
        amount: 6,
        currentBalance: 6,
      }),
      6,
    );
  });
});

describe("buildPartnerCreditAdjustEmail", () => {
  test("zeroed subject mentions a zero balance", () => {
    const email = buildPartnerCreditAdjustEmail({
      partner: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "partner@example.com",
      },
      amount: 6,
      zeroed: true,
      walletUrl: "https://app.example.com/partner/wallet",
    });
    assert.match(email.subject, /\$0\.00/);
    assert.match(email.html, /\$6\.00/);
  });
});

describe("adjustPartnerCredits service", () => {
  test("debits wallet and emails partner on success", async () => {
    const { prisma } = await import("../../src/lib/db");
    const originalFindUnique = prisma.partner.findUnique;
    prisma.partner.findUnique = async () =>
      activePartner as Awaited<ReturnType<typeof originalFindUnique>>;

    const sent: SendResendEmailParams[] = [];

    try {
      const result = await adjustPartnerCredits(
        {
          partnerId: activePartner.id,
          mode: "reduce",
          amount: 6,
          note: "Zero leftover",
          adminUser: mockAdminUser,
        },
        {
          debitWalletFn: async (partnerId, amount, type, options) => {
            assert.equal(partnerId, activePartner.id);
            assert.equal(amount, 6);
            assert.equal(type, "admin_debit");
            assert.equal(options?.description, "Zero leftover - by Jane Admin");
            return {
              id: "tx_debit_1",
              amount: -6,
              balanceAfter: 0,
            } as Awaited<
              ReturnType<
                typeof import("../../src/lib/wallet/ledger").debitWallet
              >
            >;
          },
          sendEmail: async (params) => {
            sent.push(params);
            return { sent: true, messageId: "msg_1" };
          },
        },
      );

      assert.equal(result.emailSent, true);
      assert.equal(result.newBalance, 0);
      assert.equal(result.removed, 6);
      assert.equal(sent.length, 1);
      assert.match(sent[0]?.subject ?? "", /removed|\$0\.00/);
    } finally {
      prisma.partner.findUnique = originalFindUnique;
    }
  });
});
