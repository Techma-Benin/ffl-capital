import { LeadEventType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { emitLeadEvent } from "@/lib/leads/lead-events";
import { getIntegrationsMode } from "@/lib/settings/app-settings";
import {
  buildLeadDeliveryEmailHtml,
  buildLeadDeliveryPayload,
} from "./lead-payload";
import { deliverToRingy } from "./ringy";

export interface DeliverLeadResult {
  emailSent: boolean;
  crmPosted: boolean;
  ringyPosted: boolean;
  errors: string[];
}

export async function deliverLead(leadDeliveryId: string): Promise<DeliverLeadResult> {
  const delivery = await prisma.leadDelivery.findUnique({
    where: { id: leadDeliveryId },
    include: {
      lead: true,
      partner: true,
      filterSet: true,
    },
  });

  if (!delivery) {
    throw new Error(`Lead delivery not found: ${leadDeliveryId}`);
  }

  const { lead, partner, filterSet } = delivery;
  const mode = await getIntegrationsMode();
  const errors: string[] = [];
  let emailSent = false;
  let crmPosted = false;
  let ringyPosted = false;

  const payload = buildLeadDeliveryPayload(delivery, lead, partner);
  const leadTypeLabel =
    lead.leadType === "traditional_iul" ? "Traditional IUL" : "High Intent IUL";

  const deliveryChannel = filterSet?.deliveryChannel ?? "email";
  const crmProvider = partner.crmProvider;

  if (mode === "mock") {
    console.info(
      `[mock] deliverLead → ${partner.email} | ${lead.firstName} ${lead.lastName} (${lead.state}) channel=${deliveryChannel}`,
    );
    await emitLeadEvent(lead.id, LeadEventType.delivered, {
      mock: true,
      deliveryId: leadDeliveryId,
      channel: deliveryChannel,
    });
    return {
      emailSent: true,
      crmPosted: crmProvider === "webhook" || deliveryChannel === "webhook",
      ringyPosted: crmProvider === "ringy" || deliveryChannel === "ringy",
      errors: [],
    };
  }

  if (
    (crmProvider === "ringy" || deliveryChannel === "ringy") &&
    partner.ringySid
  ) {
    const ringyResult = await deliverToRingy(delivery, lead, partner);
    ringyPosted = ringyResult.success;
    if (!ringyResult.success) {
      errors.push(ringyResult.error ?? "Ringy delivery failed");
    }
  } else if (
    (crmProvider === "webhook" || deliveryChannel === "webhook") &&
    partner.crmWebhookUrl
  ) {
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

  if (
    resendKey &&
    (crmProvider === "email_only" || deliveryChannel === "email" || !crmPosted)
  ) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);

      await resend.emails.send({
        from: fromEmail,
        to: partner.email,
        subject: `New lead delivered — ${lead.state} ${leadTypeLabel}`,
        html: buildLeadDeliveryEmailHtml(delivery, lead, partner),
      });
      emailSent = true;
    } catch (err) {
      errors.push(`Email failed: ${err instanceof Error ? err.message : "unknown"}`);
    }
  } else if (!resendKey) {
    console.info(`[deliverLead] RESEND_API_KEY not set — skipping email to ${partner.email}`);
  }

  const eventType =
    errors.length > 0 ? LeadEventType.delivery_failed : LeadEventType.delivered;

  await emitLeadEvent(lead.id, eventType, {
    deliveryId: leadDeliveryId,
    emailSent,
    crmPosted,
    ringyPosted,
    errors,
  });

  if (errors.length > 0) {
    await prisma.leadDelivery.update({
      where: { id: leadDeliveryId },
      data: { lastDeliveryError: errors.join("; ") },
    });
  }

  return { emailSent, crmPosted, ringyPosted, errors };
}
