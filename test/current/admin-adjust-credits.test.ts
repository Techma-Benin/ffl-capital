import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildPartnerCreditAdjustEmail } from "../../src/lib/email/partner-credit-adjust-email";
import {
  AdjustPartnerCreditsError,
  adjustPartnerCredits,
  resolveCreditAdjustAmount,
} from "../../src/lib/wallet/adjust-partner-credits";
import { remainingUnusedAdminCredit } from "../../src/lib/wallet/remaining-admin-credit";
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
  walletBalance: 60,
};

describe("remainingUnusedAdminCredit", () => {
  test("grants then spend then deposit leaves only unused grant", () => {
    assert.equal(
      remainingUnusedAdminCredit(
        [
          { type: "admin_grant", amount: 20 },
          { type: "admin_grant", amount: 40 },
          { type: "lead_purchase", amount: -50, leadDeliveryId: "d1" },
          { type: "top_up", amount: 50 },
        ],
        60,
      ),
      10,
    );
  });

  test("a grant after spend is still clawable", () => {
    assert.equal(
      remainingUnusedAdminCredit(
        [
          { type: "lead_purchase", amount: -25, leadDeliveryId: "d1" },
          { type: "lead_purchase", amount: -25, leadDeliveryId: "d2" },
          { type: "admin_grant", amount: 10 },
        ],
        11,
      ),
      10,
    );
  });

  test("partners with deposits only have nothing to claw back", () => {
    assert.equal(
      remainingUnusedAdminCredit(
        [
          { type: "top_up", amount: 100 },
          { type: "lead_purchase", amount: -20, leadDeliveryId: "d1" },
        ],
        80,
      ),
      0,
    );
  });

  test("fully spent grants cannot be clawed back", () => {
    assert.equal(
      remainingUnusedAdminCredit(
        [
          { type: "admin_grant", amount: 60 },
          { type: "lead_purchase", amount: -70, leadDeliveryId: "d1" },
          { type: "top_up", amount: 50 },
        ],
        40,
      ),
      0,
    );
  });

  test("refunds restore the credit taken on that purchase", () => {
    assert.equal(
      remainingUnusedAdminCredit(
        [
          { type: "admin_grant", amount: 60 },
          { type: "lead_purchase", amount: -50, leadDeliveryId: "d1" },
          { type: "refund", amount: 20, leadDeliveryId: "d1" },
          { type: "top_up", amount: 50 },
        ],
        80,
      ),
      30,
    );
  });
});

describe("resolveCreditAdjustAmount", () => {
  test("zero uses unused admin credit, not the full wallet", () => {
    assert.equal(
      resolveCreditAdjustAmount({ mode: "zero", remainingUnusedCredit: 10 }),
      10,
    );
  });

  test("rejects when there is no unused admin credit", () => {
    assert.throws(
      () =>
        resolveCreditAdjustAmount({
          mode: "zero",
          remainingUnusedCredit: 0,
        }),
      (err: unknown) =>
        err instanceof AdjustPartnerCreditsError &&
        err.code === "no_unused_credit",
    );
  });

  test("reduce cannot exceed unused admin credit", () => {
    assert.throws(
      () =>
        resolveCreditAdjustAmount({
          mode: "reduce",
          amount: 11,
          remainingUnusedCredit: 10,
        }),
      (err: unknown) =>
        err instanceof AdjustPartnerCreditsError &&
        err.code === "exceeds_unused_credit",
    );
    assert.throws(
      () =>
        resolveCreditAdjustAmount({
          mode: "reduce",
          amount: 0,
          remainingUnusedCredit: 10,
        }),
      (err: unknown) =>
        err instanceof AdjustPartnerCreditsError &&
        err.code === "invalid_amount",
    );
  });

  test("reduce returns the requested amount when within unused credit", () => {
    assert.equal(
      resolveCreditAdjustAmount({
        mode: "reduce",
        amount: 10,
        remainingUnusedCredit: 10,
      }),
      10,
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
  test("debits unused credit only and emails partner on success", async () => {
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
          amount: 10,
          note: "Unused grant leftover",
          adminUser: mockAdminUser,
        },
        {
          remainingUnusedCreditFn: async () => 10,
          debitWalletFn: async (partnerId, amount, type, options) => {
            assert.equal(partnerId, activePartner.id);
            assert.equal(amount, 10);
            assert.equal(type, "admin_debit");
            assert.equal(
              options?.description,
              "Unused grant leftover - by Jane Admin",
            );
            return {
              id: "tx_debit_1",
              amount: -10,
              balanceAfter: 50,
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
      assert.equal(result.newBalance, 50);
      assert.equal(result.removed, 10);
      assert.equal(sent.length, 1);
      assert.match(sent[0]?.subject ?? "", /removed|\$0\.00/);
    } finally {
      prisma.partner.findUnique = originalFindUnique;
    }
  });
});
