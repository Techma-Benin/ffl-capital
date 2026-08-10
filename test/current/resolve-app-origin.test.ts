import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { buildCrmOutboundFailureEmail } from "../../src/lib/delivery/crm-outbound-failure-email";
import {
  isLoopbackOrigin,
  resolveAppOrigin,
  resolvePartnerAbsoluteUrl,
} from "../../src/lib/email/email-layout";
import { buildPartnerCreditGrantEmail } from "../../src/lib/email/partner-credit-grant-email";

const ORIGINAL_APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const ORIGINAL_REPLIT = process.env.REPLIT_DOMAINS;

afterEach(() => {
  if (ORIGINAL_APP_URL === undefined) {
    delete process.env.NEXT_PUBLIC_APP_URL;
  } else {
    process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_APP_URL;
  }
  if (ORIGINAL_REPLIT === undefined) {
    delete process.env.REPLIT_DOMAINS;
  } else {
    process.env.REPLIT_DOMAINS = ORIGINAL_REPLIT;
  }
});

describe("isLoopbackOrigin", () => {
  test("detects localhost, 127.0.0.1, and *.localhost", () => {
    assert.equal(isLoopbackOrigin("https://localhost:5000"), true);
    assert.equal(isLoopbackOrigin("http://127.0.0.1:3000"), true);
    assert.equal(isLoopbackOrigin("http://app.localhost:3000"), true);
    assert.equal(isLoopbackOrigin("https://portal.example.com"), false);
  });
});

describe("resolveAppOrigin", () => {
  test("prefers NEXT_PUBLIC_APP_URL over explicit localhost origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com/";
    delete process.env.REPLIT_DOMAINS;

    assert.equal(
      resolveAppOrigin("https://localhost:5000"),
      "https://app.example.com",
    );
  });

  test("falls back to REPLIT_DOMAINS when public URL missing", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.REPLIT_DOMAINS = "ffl.example.replit.app,other.replit.app";

    assert.equal(
      resolveAppOrigin("http://localhost:5000"),
      "https://ffl.example.replit.app",
    );
  });

  test("uses non-loopback explicit origin when no public env", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.REPLIT_DOMAINS;

    assert.equal(
      resolveAppOrigin("https://preview.example.com"),
      "https://preview.example.com",
    );
  });

  test("falls back to local-dev default when nothing public is set", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.REPLIT_DOMAINS;

    assert.equal(resolveAppOrigin("https://localhost:5000"), "http://localhost:3000");
  });
});

describe("email CTA absolute URLs", () => {
  test("wallet credit-grant ignores localhost appOrigin when public URL set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    delete process.env.REPLIT_DOMAINS;

    const email = buildPartnerCreditGrantEmail({
      partner: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
      },
      amount: 100,
      note: "",
      appOrigin: "https://localhost:5000",
    });

    assert.match(email.html, /https:\/\/app\.example\.com\/partner\/wallet/);
    assert.doesNotMatch(email.html, /localhost:5000/);
  });

  test("CRM failure CTA uses public origin when explicit origin is loopback", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    delete process.env.REPLIT_DOMAINS;

    const email = buildCrmOutboundFailureEmail({
      partnerFirstName: "Ada",
      leadId: "lead_1",
      deliveryId: "delivery_1",
      endpointUrl: "https://crm.example.com/hooks/leads",
      statusCode: 502,
      errorMessage: "Bad Gateway",
      appOrigin: "http://127.0.0.1:5000",
    });

    assert.match(
      email.html,
      /https:\/\/app\.example\.com\/partner\/settings\/crm-outbound/,
    );
    assert.doesNotMatch(email.html, /127\.0\.0\.1/);
  });

  test("resolvePartnerAbsoluteUrl strips trailing slash on origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com/";
    delete process.env.REPLIT_DOMAINS;

    assert.equal(
      resolvePartnerAbsoluteUrl("/partner/wallet", "https://localhost:5000"),
      "https://app.example.com/partner/wallet",
    );
  });
});
