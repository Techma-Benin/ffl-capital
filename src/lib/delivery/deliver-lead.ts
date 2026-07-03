import { prisma } from "@/lib/db";
import { getIntegrationsMode } from "@/lib/settings/app-settings";

export interface DeliverLeadResult {
  emailSent: boolean;
  crmPosted: boolean;
  errors: string[];
}

export async function deliverLead(leadDeliveryId: string): Promise<DeliverLeadResult> {
  const delivery = await prisma.leadDelivery.findUnique({
    where: { id: leadDeliveryId },
    include: { lead: true, partner: true },
  });

  if (!delivery) {
    throw new Error(`Lead delivery not found: ${leadDeliveryId}`);
  }

  const { lead, partner } = delivery;
  const mode = await getIntegrationsMode();
  const errors: string[] = [];
  let emailSent = false;
  let crmPosted = false;

  const payload = {
    deliveryId: delivery.id,
    channel: delivery.channel,
    leadId: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    state: lead.state,
    leadType: lead.leadType,
    trustedformCertUrl: lead.trustedformCertUrl,
    price: Number(delivery.price),
    deliveredAt: delivery.deliveredAt.toISOString(),
  };

  if (mode === "mock") {
    console.info(
      `[mock] deliverLead → ${partner.email} | ${lead.firstName} ${lead.lastName} (${lead.state})`,
    );
    return { emailSent: true, crmPosted: !!partner.crmWebhookUrl, errors: [] };
  }

  if (partner.crmWebhookUrl) {
    try {
      const res = await fetch(partner.crmWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      crmPosted = res.ok;
      if (!res.ok) errors.push(`CRM webhook returned ${res.status}`);
    } catch (err) {
      errors.push(`CRM webhook failed: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL ?? "leads@fflcapital.com";

  if (resendKey) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);
      const leadTypeLabel =
        lead.leadType === "traditional_iul" ? "Traditional IUL" : "High Intent IUL";

      await resend.emails.send({
        from: fromEmail,
        to: partner.email,
        subject: `New lead delivered — ${lead.state} ${leadTypeLabel}`,
        html: `
          <h2>New lead delivered</h2>
          <p><strong>${lead.firstName} ${lead.lastName}</strong></p>
          <p>State: ${lead.state} · Type: ${leadTypeLabel}</p>
          <p>Phone: ${lead.phone}<br>Email: ${lead.email}</p>
          <p>Channel: ${delivery.channel} · Price: $${Number(delivery.price).toFixed(2)}</p>
          ${lead.trustedformCertUrl ? `<p><a href="${lead.trustedformCertUrl}">TrustedForm certificate</a></p>` : ""}
        `,
      });
      emailSent = true;
    } catch (err) {
      errors.push(`Email failed: ${err instanceof Error ? err.message : "unknown"}`);
    }
  } else {
    console.info(`[deliverLead] RESEND_API_KEY not set — skipping email to ${partner.email}`);
  }

  return { emailSent, crmPosted, errors };
}
