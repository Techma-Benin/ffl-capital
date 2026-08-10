import type { Lead, LeadDelivery, Partner } from "@prisma/client";
import { formatUsd } from "@/lib/format-money";
import {
  escapeHtml,
  partnerEmailCtaButton,
  partnerEmailFieldRows,
  resolvePartnerAbsoluteUrl,
  wrapPartnerEmailHtml,
} from "@/lib/email/email-layout";
import {
  resolveLeadTypeDisplay,
  type CategoryLabelSource,
} from "@/lib/lead-categories/category-labels";

export function resolveLeadDeliveryTypeLabel(
  lead: Pick<
    Lead,
    "leadType" | "categoryResolution" | "categoryCandidateTypes"
  >,
  categories: CategoryLabelSource[],
): string {
  return resolveLeadTypeDisplay({
    leadType: lead.leadType,
    categoryResolution: lead.categoryResolution,
    categoryCandidateTypes: lead.categoryCandidateTypes,
    categories,
  }).label;
}

export function buildLeadDeliveryPayload(
  delivery: LeadDelivery,
  lead: Lead,
  partner: Partner,
  categories: CategoryLabelSource[] = [],
) {
  const leadTypeLabel = resolveLeadDeliveryTypeLabel(lead, categories);

  return {
    deliveryId: delivery.id,
    channel: delivery.channel,
    leadId: lead.id,
    externalId: lead.externalId,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    address: lead.address,
    city: lead.city,
    state: lead.state,
    zip: lead.zip,
    dob: lead.dob,
    age: lead.age,
    leadType: lead.leadType,
    leadTypeLabel,
    intent: lead.intent,
    haveIul: lead.haveIul,
    primaryGoal: lead.primaryGoal,
    stateYouCurrentlyLiveIn: lead.stateYouCurrentlyLiveIn,
    trustedformCertUrl: lead.trustedformCertUrl,
    tcpaConsent: lead.tcpaConsent,
    tcpaLanguage: lead.tcpaLanguage,
    leadidToken: lead.leadidToken,
    source: lead.source,
    landingPage: lead.landingPage,
    subId: lead.subId,
    pubId: lead.pubId,
    boberdooLeadType: lead.boberdooLeadType,
    ipAddress: lead.ipAddress,
    userAgent: lead.userAgent,
    receivedAt: lead.receivedAt.toISOString(),
    price: Number(delivery.price),
    deliveredAt: delivery.deliveredAt.toISOString(),
    partnerId: partner.id,
    partnerEmail: partner.email,
  };
}

export function buildLeadDeliveryEmailHtml(
  delivery: LeadDelivery,
  lead: Lead,
  partner: Partner,
  categories: CategoryLabelSource[] = [],
  options: {
    appOrigin?: string;
    leadUrl?: string;
  } = {},
): string {
  const payload = buildLeadDeliveryPayload(delivery, lead, partner, categories);
  const firstName = partner.firstName.trim() || "there";
  const leadUrl =
    options.leadUrl?.trim() ||
    resolvePartnerAbsoluteUrl(
      `/partner/leads/${delivery.id}`,
      options.appOrigin,
    );

  const fullName = `${lead.firstName} ${lead.lastName}`.trim();

  const rowsHtml = partnerEmailFieldRows([
    { label: "Name", value: fullName || null },
    { label: "Phone", value: lead.phone },
    { label: "Email", value: lead.email },
    { label: "Address", value: lead.address },
    { label: "City", value: lead.city },
    { label: "State", value: lead.state },
    { label: "Zip", value: lead.zip },
    { label: "DOB", value: lead.dob },
    { label: "Age", value: lead.age },
    { label: "Type", value: payload.leadTypeLabel },
    { label: "Intent", value: lead.intent },
    { label: "Have IUL", value: lead.haveIul },
    { label: "Primary Goal", value: lead.primaryGoal },
    { label: "State (live in)", value: lead.stateYouCurrentlyLiveIn },
    { label: "TCPA Consent", value: lead.tcpaConsent },
    { label: "TCPA Language", value: lead.tcpaLanguage },
    { label: "LeadiD Token", value: lead.leadidToken },
    { label: "TrustedForm", value: lead.trustedformCertUrl },
    { label: "Source", value: lead.source },
    { label: "Landing Page", value: lead.landingPage },
    { label: "Sub ID", value: lead.subId },
    { label: "Pub ID", value: lead.pubId },
    { label: "External ID", value: lead.externalId },
    { label: "Boberdoo Lead Type", value: lead.boberdooLeadType },
    { label: "IP Address", value: lead.ipAddress },
    { label: "User Agent", value: lead.userAgent },
    { label: "Channel", value: delivery.channel },
    { label: "Price", value: formatUsd(delivery.price) },
    { label: "Received", value: new Date(lead.receivedAt).toLocaleString() },
  ]);

  const bodyHtml = `
    <p style="margin:0 0 16px">Hello ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 20px">We have delivered a new lead to your account. Details are below.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
      ${rowsHtml}
    </table>
    ${partnerEmailCtaButton(leadUrl, "Open in portal")}
  `.trim();

  return wrapPartnerEmailHtml({
    title: "New lead delivered",
    bodyHtml,
    footerNote: `Delivered to ${partner.email}.`,
  });
}
