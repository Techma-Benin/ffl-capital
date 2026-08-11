import {
  escapeHtml,
  escapeHtmlMultiline,
  partnerEmailFieldRows,
  wrapPartnerEmailHtml,
} from "@/lib/email/email-layout";
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

export function buildAdminContactEmail(params: {
  topic: ContactTopicValue;
  message: string;
  customTopic?: string;
  partner: PartnerContactIdentity;
}): { subject: string; html: string } {
  const topicLabel = resolveContactTopicLabel(params.topic, params.customTopic);
  const subject = `Partner contact: ${topicLabel}`;
  const safeMessage = escapeHtmlMultiline(params.message.trim());
  const metaRows = partnerEmailFieldRows([
    {
      label: "Partner",
      value: `${params.partner.firstName} ${params.partner.lastName}`.trim(),
    },
    { label: "Email", value: params.partner.email },
    { label: "Partner ID", value: params.partner.id },
    { label: "Status", value: params.partner.status },
  ]);

  const bodyHtml = `
    <p style="margin:0 0 8px"><strong>Topic</strong></p>
    <p style="margin:0 0 16px">${escapeHtml(topicLabel)}</p>
    <p style="margin:0 0 8px"><strong>Message</strong></p>
    <p style="margin:0 0 24px">${safeMessage}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
      ${metaRows}
    </table>
  `.trim();

  const html = wrapPartnerEmailHtml({
    title: "Partner contact request",
    bodyHtml,
  });

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
  const safeMessage = escapeHtmlMultiline(params.message.trim());
  const rowsHtml = partnerEmailFieldRows([
    { label: "Topic", value: topicLabel },
  ]);

  const bodyHtml = `
    <p style="margin:0 0 16px">Hello ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 20px">We received your message and will reply soon.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
      ${rowsHtml}
    </table>
    <p style="margin:20px 0 8px"><strong>Message</strong></p>
    <p style="margin:0">${safeMessage}</p>
  `.trim();

  const html = wrapPartnerEmailHtml({
    title: "Message received",
    bodyHtml,
    footerNote: `This is an automated confirmation. Please do not reply to this email — the administrator will contact you at ${params.partnerEmail}.`,
  });

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
