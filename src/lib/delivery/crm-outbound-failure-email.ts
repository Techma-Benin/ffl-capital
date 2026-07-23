import { endpointHostForDisplay } from "./outbound-url-guard";

export function buildCrmOutboundFailureEmail(params: {
  leadId: string;
  deliveryId: string;
  endpointUrl: string;
  statusCode?: number;
  errorMessage: string;
}): { subject: string; html: string } {
  const host = endpointHostForDisplay(params.endpointUrl);
  const subject = "CRM delivery failed";
  const statusLine =
    params.statusCode !== undefined
      ? `<p><strong>HTTP status:</strong> ${params.statusCode}</p>`
      : "";

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#0f172a">
      <p>Your CRM endpoint did not accept the lead delivery.</p>
      <p><strong>Lead ID:</strong> ${params.leadId}</p>
      <p><strong>Delivery ID:</strong> ${params.deliveryId}</p>
      <p><strong>Endpoint:</strong> ${host}</p>
      ${statusLine}
      <p><strong>Reason:</strong> ${params.errorMessage}</p>
      <p style="color:#64748b;font-size:13px">Lead payload was not included in this notice for security.</p>
    </div>
  `.trim();

  return { subject, html };
}

export async function sendCrmOutboundFailureEmail(params: {
  toEmail: string;
  leadId: string;
  deliveryId: string;
  endpointUrl: string;
  statusCode?: number;
  errorMessage: string;
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
