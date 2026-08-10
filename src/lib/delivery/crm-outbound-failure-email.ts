import {
  escapeHtml,
  partnerEmailCtaButton,
  partnerEmailFieldRows,
  resolvePartnerAbsoluteUrl,
  wrapPartnerEmailHtml,
} from "@/lib/email/email-layout";
import { endpointHostForDisplay } from "./outbound-url-display";

export function buildCrmOutboundFailureEmail(params: {
  partnerFirstName?: string;
  leadId: string;
  deliveryId: string;
  endpointUrl: string;
  statusCode?: number;
  errorMessage: string;
  crmSettingsUrl?: string;
  appOrigin?: string;
}): { subject: string; html: string } {
  const firstName = params.partnerFirstName?.trim() || "there";
  const host = endpointHostForDisplay(params.endpointUrl);
  const subject = "CRM delivery failed";
  const crmSettingsUrl =
    params.crmSettingsUrl?.trim() ||
    resolvePartnerAbsoluteUrl(
      "/partner/settings/crm-outbound",
      params.appOrigin,
    );

  const rowsHtml = partnerEmailFieldRows([
    { label: "Lead ID", value: params.leadId },
    { label: "Delivery ID", value: params.deliveryId },
    { label: "Endpoint", value: host },
    {
      label: "HTTP status",
      value:
        params.statusCode !== undefined ? String(params.statusCode) : null,
    },
    { label: "Reason", value: params.errorMessage },
  ]);

  const bodyHtml = `
    <p style="margin:0 0 16px">Hello ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 20px">
      We were unable to deliver a lead to your CRM endpoint. Please review the details below and update your CRM settings if needed.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
      ${rowsHtml}
    </table>
    ${partnerEmailCtaButton(crmSettingsUrl, "Open CRM settings")}
  `.trim();

  const html = wrapPartnerEmailHtml({
    title: "CRM delivery failed",
    bodyHtml,
    footerNote:
      "Lead payload was not included in this notice for security.",
  });

  return { subject, html };
}

export async function sendCrmOutboundFailureEmail(params: {
  toEmail: string;
  partnerFirstName?: string;
  leadId: string;
  deliveryId: string;
  endpointUrl: string;
  statusCode?: number;
  errorMessage: string;
  crmSettingsUrl?: string;
  appOrigin?: string;
}): Promise<{ sent: boolean; error?: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }

  const resendMock = process.env.RESEND_MOCK === "true";
  const fromEmail = resendMock ? "onboarding@resend.dev" : process.env.FROM_EMAIL;
  if (!fromEmail) {
    return { sent: false, error: "FROM_EMAIL not configured" };
  }

  const { subject, html } = buildCrmOutboundFailureEmail(params);

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);
    const result = await resend.emails.send({
      from: fromEmail,
      to: params.toEmail,
      subject,
      html,
    });
    if (result.error) {
      return { sent: false, error: result.error.message ?? "Resend error" };
    }
    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "Email send failed",
    };
  }
}
