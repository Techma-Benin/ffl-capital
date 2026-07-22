import type { Lead, LeadDelivery, Partner } from "@prisma/client";
import { formatUsd } from "@/lib/format-money";

export function buildLeadDeliveryPayload(
  delivery: LeadDelivery,
  lead: Lead,
  partner: Partner,
) {
  const leadTypeLabel =
    lead.leadType === "traditional_iul" ? "Traditional IUL" : "High Intent IUL";

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

function fieldRow(label: string, value: string | null | undefined): string {
  if (!value) return "";
  return `<tr><td style="padding:4px 12px 4px 0;color:#64748b;vertical-align:top">${label}</td><td style="padding:4px 0">${value}</td></tr>`;
}

export function buildLeadDeliveryEmailHtml(
  delivery: LeadDelivery,
  lead: Lead,
  partner: Partner,
): string {
  const payload = buildLeadDeliveryPayload(delivery, lead, partner);
  const certLink = lead.trustedformCertUrl
    ? `<p><a href="${lead.trustedformCertUrl}">TrustedForm certificate</a></p>`
    : "";

  const rows = [
    fieldRow("Name", `${lead.firstName} ${lead.lastName}`),
    fieldRow("Email", lead.email),
    fieldRow("Phone", lead.phone),
    fieldRow("Address", lead.address),
    fieldRow("City", lead.city),
    fieldRow("State", lead.state),
    fieldRow("Zip", lead.zip),
    fieldRow("DOB", lead.dob),
    fieldRow("Age", lead.age),
    fieldRow("Type", payload.leadTypeLabel),
    fieldRow("Intent", lead.intent),
    fieldRow("Have IUL", lead.haveIul),
    fieldRow("Primary Goal", lead.primaryGoal),
    fieldRow("State (live in)", lead.stateYouCurrentlyLiveIn),
    fieldRow("TCPA Consent", lead.tcpaConsent),
    fieldRow("TCPA Language", lead.tcpaLanguage),
    fieldRow("LeadiD Token", lead.leadidToken),
    fieldRow("Source", lead.source),
    fieldRow("Landing Page", lead.landingPage),
    fieldRow("Sub ID", lead.subId),
    fieldRow("Pub ID", lead.pubId),
    fieldRow("External ID", lead.externalId),
    fieldRow("Boberdoo Lead Type", lead.boberdooLeadType),
    fieldRow("IP Address", lead.ipAddress),
    fieldRow("User Agent", lead.userAgent),
    fieldRow("Channel", delivery.channel),
    fieldRow("Price", formatUsd(delivery.price)),
    fieldRow("Received", new Date(lead.receivedAt).toLocaleString()),
  ].join("");

  return `
    <h2>New lead delivered</h2>
    <table style="border-collapse:collapse;font-size:14px;line-height:1.5">${rows}</table>
    ${certLink}
  `;
}
