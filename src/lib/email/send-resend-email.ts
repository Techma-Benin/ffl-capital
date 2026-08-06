export type SendResendEmailParams = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

export type SendResendEmailResult =
  | { sent: true; messageId: string | null }
  | { sent: false; error: string };

/**
 * Shared Resend send helper (same env/mock pattern as lead delivery).
 */
export async function sendResendEmail(
  params: SendResendEmailParams,
): Promise<SendResendEmailResult> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }

  const resendMock = process.env.RESEND_MOCK === "true";
  const fromEmail = resendMock
    ? "onboarding@resend.dev"
    : process.env.FROM_EMAIL;
  if (!fromEmail) {
    return { sent: false, error: "FROM_EMAIL not configured" };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);
    const result = await resend.emails.send({
      from: fromEmail,
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.replyTo ? { replyTo: params.replyTo } : {}),
    });

    if (result.error) {
      return {
        sent: false,
        error: result.error.message ?? "Resend returned an error",
      };
    }

    return { sent: true, messageId: result.data?.id ?? null };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "Email send failed",
    };
  }
}
