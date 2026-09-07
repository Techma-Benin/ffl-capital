import { formatUsd } from "@/lib/format-money";
import {
  escapeHtml,
  isLoopbackOrigin,
  partnerEmailCtaButton,
  resolvePartnerAbsoluteUrl,
  wrapPartnerEmailHtml,
} from "@/lib/email/email-layout";

export type PartnerCreditAdjustPartner = {
  firstName: string;
  lastName: string;
  email: string;
};

export function buildPartnerCreditAdjustEmail(params: {
  partner: PartnerCreditAdjustPartner;
  amount: number;
  zeroed: boolean;
  walletUrl?: string;
  appOrigin?: string;
}): { subject: string; html: string } {
  const amountFormatted = formatUsd(params.amount);
  const firstName = params.partner.firstName.trim() || "there";
  const rawWalletUrl = params.walletUrl?.trim();
  const walletUrl =
    (rawWalletUrl && !isLoopbackOrigin(rawWalletUrl) ? rawWalletUrl : null) ||
    resolvePartnerAbsoluteUrl("/partner/wallet", params.appOrigin);

  const subject = params.zeroed
    ? "Your partner wallet was set to $0.00"
    : `${amountFormatted} removed from your account`;

  const bodyHtml = `
    <p style="margin:0 0 16px">Hello ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 16px">
      ${
        params.zeroed
          ? `Your partner wallet balance has been set to <strong>$0.00</strong> (${escapeHtml(amountFormatted)} removed).`
          : `<strong>${escapeHtml(amountFormatted)}</strong> has been removed from your partner wallet.`
      }
    </p>
    ${partnerEmailCtaButton(walletUrl, "View your wallet")}
  `.trim();

  const html = wrapPartnerEmailHtml({
    title: params.zeroed ? "Wallet set to zero" : "Credit removed",
    bodyHtml,
    footerNote: `This is an automated notification for ${params.partner.email}.`,
  });

  return { subject, html };
}
