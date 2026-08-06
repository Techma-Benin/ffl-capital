import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildAdminContactEmail,
  buildPartnerConfirmationEmail,
  deliverPartnerContact,
} from "../../src/lib/partner/contact-delivery";
import { partnerContactSchema } from "../../src/lib/partner/contact-schema";
import { DEFAULT_CONTACT_RECIPIENT_EMAIL } from "../../src/lib/settings/contact-recipient";
import type { SendResendEmailParams } from "../../src/lib/email/send-resend-email";

const partner = {
  id: "partner_1",
  email: "partner@example.com",
  firstName: "Ada",
  lastName: "Lovelace",
  status: "active",
};

describe("partner contact request validation", () => {
  test("accepts a valid topic and message", () => {
    const result = partnerContactSchema.safeParse({
      topic: "billing",
      message: "Need an invoice copy",
    });
    assert.equal(result.success, true);
  });

  test("rejects unknown topics", () => {
    const result = partnerContactSchema.safeParse({
      topic: "not-a-topic",
      message: "Hello",
    });
    assert.equal(result.success, false);
  });

  test("rejects blank messages", () => {
    const result = partnerContactSchema.safeParse({
      topic: "account",
      message: "   ",
    });
    assert.equal(result.success, false);
  });

  test("rejects other without customTopic", () => {
    const result = partnerContactSchema.safeParse({
      topic: "other",
      message: "Hello",
    });
    assert.equal(result.success, false);
  });

  test("accepts other with customTopic", () => {
    const result = partnerContactSchema.safeParse({
      topic: "other",
      customTopic: "Partnership inquiry",
      message: "Hello",
    });
    assert.equal(result.success, true);
  });
});

describe("partner contact email builders", () => {
  test("admin email includes topic, message, and partner metadata", () => {
    const email = buildAdminContactEmail({
      topic: "activation",
      message: "Please activate my account",
      partner,
    });

    assert.match(email.subject, /Account activation request/);
    assert.match(email.html, /Please activate my account/);
    assert.match(email.html, /Ada Lovelace/);
    assert.match(email.html, /partner@example.com/);
    assert.match(email.html, /partner_1/);
    assert.match(email.html, /active/);
  });

  test("confirmation email acknowledges receipt with message recap", () => {
    const email = buildPartnerConfirmationEmail({
      topic: "refund",
      message: "Please refund lead #42",
      partnerFirstName: "Ada",
      partnerEmail: "partner@example.com",
    });

    assert.equal(email.subject, "We received your message");
    assert.match(email.html, /Hi Ada/);
    assert.match(email.html, /Refund request/);
    assert.match(email.html, /Please refund lead #42/);
    assert.match(email.html, /do not reply to this email/);
    assert.match(email.html, /partner@example.com/);
  });

  test("admin email uses custom topic when topic is other", () => {
    const email = buildAdminContactEmail({
      topic: "other",
      customTopic: "Partnership inquiry",
      message: "Interested in co-marketing",
      partner,
    });

    assert.match(email.subject, /Partnership inquiry/);
    assert.match(email.html, /Partnership inquiry/);
    assert.match(email.html, /Interested in co-marketing/);
    assert.doesNotMatch(email.subject, /\[Partner Portal\] Other$/);
  });

  test("confirmation email uses custom topic when topic is other", () => {
    const email = buildPartnerConfirmationEmail({
      topic: "other",
      customTopic: "Partnership inquiry",
      message: "Interested in co-marketing",
      partnerFirstName: "Ada",
      partnerEmail: "partner@example.com",
    });

    assert.match(email.html, /Partnership inquiry/);
    assert.match(email.html, /Interested in co-marketing/);
    assert.match(email.html, /do not reply to this email/);
  });
});

describe("partner contact delivery", () => {
  test("uses the configured recipient and sends admin then confirmation", async () => {
    const sent: SendResendEmailParams[] = [];

    const result = await deliverPartnerContact(
      {
        topic: "technical",
        message: "API timeouts since Monday",
        partner,
      },
      {
        getRecipientEmail: async () => "ops@fflcapital.com",
        sendEmail: async (params) => {
          sent.push(params);
          return { sent: true, messageId: `msg_${sent.length}` };
        },
      },
    );

    assert.deepEqual(result, { ok: true, confirmationSent: true });
    assert.equal(sent.length, 2);
    assert.equal(sent[0]?.to, "ops@fflcapital.com");
    assert.equal(sent[0]?.replyTo, partner.email);
    assert.equal(sent[1]?.to, partner.email);
    assert.match(sent[0]?.subject ?? "", /Technical issue/);
    assert.equal(sent[1]?.subject, "We received your message");
  });

  test("falls back to the default recipient when getter returns default", async () => {
    const sent: SendResendEmailParams[] = [];

    const result = await deliverPartnerContact(
      {
        topic: "other",
        customTopic: "General question",
        message: "General question",
        partner,
      },
      {
        getRecipientEmail: async () => DEFAULT_CONTACT_RECIPIENT_EMAIL,
        sendEmail: async (params) => {
          sent.push(params);
          return { sent: true, messageId: null };
        },
      },
    );

    assert.equal(result.ok, true);
    assert.equal(sent[0]?.to, DEFAULT_CONTACT_RECIPIENT_EMAIL);
  });

  test("does not send confirmation when the admin email fails", async () => {
    const sent: SendResendEmailParams[] = [];

    const result = await deliverPartnerContact(
      { topic: "billing", message: "Question", partner },
      {
        getRecipientEmail: async () => DEFAULT_CONTACT_RECIPIENT_EMAIL,
        sendEmail: async (params) => {
          sent.push(params);
          return { sent: false, error: "RESEND_API_KEY not configured" };
        },
      },
    );

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Unable to send/);
    }
    assert.equal(sent.length, 1);
  });

  test("returns success with warning when confirmation fails", async () => {
    let calls = 0;

    const result = await deliverPartnerContact(
      { topic: "account", message: "Status question", partner },
      {
        getRecipientEmail: async () => "admin@fflcapital.com",
        sendEmail: async () => {
          calls += 1;
          if (calls === 1) return { sent: true, messageId: "admin_1" };
          return { sent: false, error: "bounce" };
        },
      },
    );

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.confirmationSent, false);
      assert.match(result.confirmationWarning ?? "", /could not email you a confirmation/);
    }
    assert.equal(calls, 2);
  });
});
