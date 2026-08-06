import { sendResendEmail } from "@/lib/email/send-resend-email";
import { getContactRecipientEmail } from "@/lib/settings/app-settings";
import {
  resolveContactTopicLabel,
  type ContactTopicValue,
} from "@/lib/partner/contact-topics";

export type PartnerContactIdentity = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
};

export type DeliverPartnerContactInput = {
  topic: ContactTopicValue;
  message: string;
  customTopic?: string;
  partner: PartnerContactIdentity;
};

export type DeliverPartnerContactResult =
  | {
      ok: true;
      confirmationSent: boolean;
      confirmationWarning?: string;
    }
  | { ok: false; error: string };

export type DeliverPartnerContactDeps = {
  getRecipientEmail?: () => Promise<string>;
  sendEmail?: typeof sendResendEmail;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMessageHtml(message: string): string {
  return escapeHtml(message.trim()).replace(/\n/g, "<br/>");
}

export function buildAdminContactEmail(params: {
  topic: ContactTopicValue;
  message: string;
  customTopic?: string;
  partner: PartnerContactIdentity;
}): { subject: string; html: string } {
  const topicLabel = resolveContactTopicLabel(params.topic, params.customTopic);
  const subject = `[Partner Portal] ${topicLabel}`;
  const safeMessage = formatMessageHtml(params.message);

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#0f172a">
      <p><strong>Topic:</strong> ${escapeHtml(topicLabel)}</p>
      <p><strong>Message:</strong></p>
      <p>${safeMessage}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
      <p style="color:#64748b;font-size:13px">
        <strong>Partner:</strong> ${escapeHtml(params.partner.firstName)} ${escapeHtml(params.partner.lastName)}<br/>
        <strong>Email:</strong> ${escapeHtml(params.partner.email)}<br/>
        <strong>Partner ID:</strong> ${escapeHtml(params.partner.id)}<br/>
        <strong>Status:</strong> ${escapeHtml(params.partner.status)}
      </p>
    </div>
  `.trim();

  return { subject, html };
}

export function buildPartnerConfirmationEmail(params: {
  topic: ContactTopicValue;
  customTopic?: string;
  message: string;
  partnerFirstName: string;
  partnerEmail: string;
}): { subject: string; html: string } {
  const topicLabel = resolveContactTopicLabel(params.topic, params.customTopic);
  const subject = "We received your message";
  const firstName = params.partnerFirstName.trim() || "there";
  const safeMessage = formatMessageHtml(params.message);

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#0f172a">
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>We received your message and will reply soon.</p>
      <p><strong>Topic:</strong> ${escapeHtml(topicLabel)}</p>
      <p><strong>Message:</strong></p>
      <p>${safeMessage}</p>
      <p style="color:#64748b;font-size:13px">
        This is an automated confirmation. Please do not reply to this email —
        the administrator will contact you at ${escapeHtml(params.partnerEmail)}.
      </p>
    </div>
  `.trim();

  return { subject, html };
}

/**
 * Send the admin contact email via Resend, then a partner confirmation.
 * Confirmation failure does not fail the overall contact request.
 */
export async function deliverPartnerContact(
  input: DeliverPartnerContactInput,
  deps: DeliverPartnerContactDeps = {},
): Promise<DeliverPartnerContactResult> {
  const getRecipient = deps.getRecipientEmail ?? getContactRecipientEmail;
  const sendEmail = deps.sendEmail ?? sendResendEmail;

  const recipient = await getRecipient();
  const adminEmail = buildAdminContactEmail(input);

  const adminSend = await sendEmail({
    to: recipient,
    subject: adminEmail.subject,
    html: adminEmail.html,
    replyTo: input.partner.email,
  });

  if (!adminSend.sent) {
    console.error("[partner-contact] admin email failed", {
      error: adminSend.error,
      partnerId: input.partner.id,
    });
    return {
      ok: false,
      error: "Unable to send your message right now. Please try again later.",
    };
  }

  const confirmation = buildPartnerConfirmationEmail({
    topic: input.topic,
    customTopic: input.customTopic,
    message: input.message,
    partnerFirstName: input.partner.firstName,
    partnerEmail: input.partner.email,
  });

  const confirmationSend = await sendEmail({
    to: input.partner.email,
    subject: confirmation.subject,
    html: confirmation.html,
  });

  if (!confirmationSend.sent) {
    console.error("[partner-contact] confirmation email failed", {
      error: confirmationSend.error,
      partnerId: input.partner.id,
    });
    return {
      ok: true,
      confirmationSent: false,
      confirmationWarning:
        "Your message was sent, but we could not email you a confirmation.",
    };
  }

  return { ok: true, confirmationSent: true };
}
