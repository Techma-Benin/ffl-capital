import { formatUsd } from "@/lib/format-money";
import {
  escapeHtml,
  escapeHtmlMultiline,
  isLoopbackOrigin,
  partnerEmailCtaButton,
  resolvePartnerAbsoluteUrl,
  wrapPartnerEmailHtml,
} from "@/lib/email/email-layout";

export type PartnerCreditGrantPartner = {
  firstName: string;
  lastName: string;
  email: string;
};

export function buildPartnerCreditGrantEmail(params: {
  partner: PartnerCreditGrantPartner;
  amount: number;
  note: string;
  /** Absolute wallet URL; loopback hosts are ignored in favor of public origin. */
  walletUrl?: string;
  /** Optional request origin; loopback (e.g. Replit localhost:5000) is ignored. */
  appOrigin?: string;
}): { subject: string; html: string } {
  const amountFormatted = formatUsd(params.amount);
  const firstName = params.partner.firstName.trim() || "there";
  const rawWalletUrl = params.walletUrl?.trim();
  const walletUrl =
    (rawWalletUrl && !isLoopbackOrigin(rawWalletUrl) ? rawWalletUrl : null) ||
    resolvePartnerAbsoluteUrl("/partner/wallet", params.appOrigin);
  const noteTrimmed = params.note.trim();
  const noteBlock = noteTrimmed
    ? `<p style="margin:20px 0 0"><strong>Note</strong></p>
       <p style="margin:8px 0 0">${escapeHtmlMultiline(noteTrimmed)}</p>`
    : "";

  const subject = `[Partner Portal] ${amountFormatted} credit added to your account`;

  const bodyHtml = `
    <p style="margin:0 0 16px">Hello ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 16px">
      We're happy to let you know that
      <strong>${escapeHtml(amountFormatted)}</strong>
      has been added to your partner wallet.
    </p>
    ${noteBlock}
    ${partnerEmailCtaButton(walletUrl, "View your wallet")}
  `.trim();

  const html = wrapPartnerEmailHtml({
    title: "Credit added",
    bodyHtml,
    footerNote: `This is an automated notification for ${params.partner.email}.`,
  });

  return { subject, html };
}
