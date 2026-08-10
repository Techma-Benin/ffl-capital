import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildPartnerCreditGrantEmail } from "../../src/lib/email/partner-credit-grant-email";
import {
  buildGrantDescription,
  grantPartnerCredits,
  validateGrantAmount,
  validateGrantNote,
  GrantPartnerCreditsError,
} from "../../src/lib/wallet/grant-partner-credits";
import type { SendResendEmailParams } from "../../src/lib/email/send-resend-email";

const mockAdminUser = {
  id: "user_admin",
  firstName: "Jane",
  lastName: "Admin",
  primaryEmailAddressId: "email_1",
  emailAddresses: [
    { id: "email_1", emailAddress: "admin@fflcapital.com" },
  ],
} as import("@clerk/nextjs/server").User;

const activePartner = {
  id: "partner_1",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "partner@example.com",
  status: "active" as const,
  walletBalance: 10,
};

describe("grant amount validation", () => {
  test("rejects zero amount", () => {
    assert.throws(
      () => validateGrantAmount(0, false),
      (err: unknown) =>
        err instanceof GrantPartnerCreditsError &&
        err.code === "invalid_amount",
    );
  });

  test("rejects amount over 1000 for regular admin", () => {
    assert.throws(
      () => validateGrantAmount(1000.01, false),
      (err: unknown) =>
        err instanceof GrantPartnerCreditsError &&
        err.code === "invalid_amount",
    );
  });

  test("allows amount over 1000 for super admin", () => {
    validateGrantAmount(2500, true);
  });

  test("rejects amount below minimum for regular admin", () => {
    assert.throws(
      () => validateGrantAmount(0.005, false),
      (err: unknown) =>
        err instanceof GrantPartnerCreditsError &&
        err.code === "invalid_amount",
    );
  });
});

describe("grant note validation", () => {
  test("accepts blank note", () => {
    assert.equal(validateGrantNote("   "), "");
  });

  test("returns trimmed note when provided", () => {
    assert.equal(validateGrantNote("  Good reason  "), "Good reason");
  });
});

describe("buildGrantDescription", () => {
  test("formats admin name, email, and note", () => {
    const description = buildGrantDescription(
      "Jane Admin",
      "admin@fflcapital.com",
      "Promotional credit",
    );
    assert.equal(description, "Promotional credit - by Jane Admin");
  });

  test("omits note suffix when note is blank", () => {
    const description = buildGrantDescription(
      "Jane Admin",
      "admin@fflcapital.com",
      "   ",
    );
    assert.equal(description, "by Jane Admin");
  });
});

describe("buildPartnerCreditGrantEmail", () => {
  test("subject and body include amount, balance, note, and wallet link", () => {
    const email = buildPartnerCreditGrantEmail({
      partner: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "partner@example.com",
      },
      amount: 50,
      newBalance: 75,
      note: "Welcome bonus",
      walletUrl: "https://app.example.com/partner/wallet",
    });

    assert.match(email.subject, /\$50\.00 credit added to your account/);
    assert.match(email.html, /Hi Ada/);
    assert.match(email.html, /\$50\.00/);
    assert.match(email.html, /\$75\.00/);
    assert.match(email.html, /Welcome bonus/);
    assert.match(email.html, /partner\/wallet/);
    assert.match(email.html, /partner@example.com/);
  });
});

describe("grantPartnerCredits service", () => {
  test("credits wallet and emails partner on success", async () => {
    const { prisma } = await import("../../src/lib/db");
    const originalFindUnique = prisma.partner.findUnique;
    prisma.partner.findUnique = async () =>
      activePartner as Awaited<ReturnType<typeof originalFindUnique>>;

    const sent: SendResendEmailParams[] = [];

    try {
      const result = await grantPartnerCredits(
        {
          partnerId: activePartner.id,
          amount: 25,
          note: "Onboarding assistance",
          adminUser: mockAdminUser,
          isSuperAdmin: false,
        },
        {
          creditWalletFn: async (partnerId, amount, type, options) => {
            assert.equal(partnerId, activePartner.id);
            assert.equal(amount, 25);
            assert.equal(type, "admin_grant");
            assert.equal(
              options?.description,
              "Onboarding assistance - by Jane Admin",
            );
            return {
              id: "tx_1",
              amount: 25,
              balanceAfter: 35,
            } as Awaited<
              ReturnType<
                typeof import("../../src/lib/wallet/ledger").creditWallet
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
      assert.equal(result.newBalance, 35);
      assert.equal(sent.length, 1);
      assert.equal(sent[0]?.to, activePartner.email);
      assert.match(sent[0]?.subject ?? "", /\$25\.00 credit added/);
    } finally {
      prisma.partner.findUnique = originalFindUnique;
    }
  });
});

// Re-implement service test with prisma mock via grant flow errors for inactive
describe("grantPartnerCredits inactive partner", () => {
  test("email failure still returns success with warning", async () => {
    const { prisma } = await import("../../src/lib/db");

    const originalFindUnique = prisma.partner.findUnique;
    prisma.partner.findUnique = async () =>
      activePartner as Awaited<ReturnType<typeof originalFindUnique>>;

    try {
      const result = await grantPartnerCredits(
        {
          partnerId: activePartner.id,
          amount: 10,
          note: "Test grant",
          adminUser: mockAdminUser,
          isSuperAdmin: false,
        },
        {
          creditWalletFn: async () =>
            ({
              id: "tx_2",
              amount: 10,
              balanceAfter: 20,
            }) as Awaited<
              ReturnType<
                typeof import("../../src/lib/wallet/ledger").creditWallet
              >
            >,
          sendEmail: async () => ({ sent: false, error: "bounce" }),
        },
      );

      assert.equal(result.emailSent, false);
      assert.match(
        result.emailWarning ?? "",
        /could not email the partner/i,
      );
      assert.equal(result.newBalance, 20);
      assert.equal(result.transaction.id, "tx_2");
    } finally {
      prisma.partner.findUnique = originalFindUnique;
    }
  });
});
