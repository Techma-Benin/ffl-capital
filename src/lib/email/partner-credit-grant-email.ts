import { formatUsd } from "@/lib/format-money";

export type PartnerCreditGrantPartner = {
  firstName: string;
  lastName: string;
  email: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildPartnerCreditGrantEmail(params: {
  partner: PartnerCreditGrantPartner;
  amount: number;
  newBalance: number;
  note: string;
  walletUrl?: string;
}): { subject: string; html: string } {
  const amountFormatted = formatUsd(params.amount);
  const balanceFormatted = formatUsd(params.newBalance);
  const firstName = params.partner.firstName.trim() || "there";
  const walletUrl =
    params.walletUrl ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/partner/wallet`;
  const safeNote = escapeHtml(params.note.trim()).replace(/\n/g, "<br/>");

  const subject = `[Partner Portal] ${amountFormatted} credit added to your account`;

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#0f172a">
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>
        <strong>${escapeHtml(amountFormatted)}</strong> has been added to your wallet balance.
      </p>
      <p><strong>New balance:</strong> ${escapeHtml(balanceFormatted)}</p>
      <p><strong>Note:</strong></p>
      <p>${safeNote}</p>
      <p style="margin-top:20px">
        <a href="${escapeHtml(walletUrl)}" style="color:#2563eb">View your wallet</a>
      </p>
      <p style="color:#64748b;font-size:13px;margin-top:24px">
        This is an automated notification for ${escapeHtml(params.partner.email)}.
      </p>
    </div>
  `.trim();

  return { subject, html };
}
