import { LeadEventType } from "@prisma/client";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { emitLeadEvent } from "@/lib/leads/lead-events";
import { getIntegrationsMode } from "@/lib/settings/app-settings";
import {
  buildLeadDeliveryEmailHtml,
  buildLeadDeliveryPayload,
} from "./lead-payload";
import { deliverToRingy } from "./ringy";

async function getPartnerEmail(partner: { clerkUserId: string | null; email: string }): Promise<string> {
  if (partner.clerkUserId) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(partner.clerkUserId);
      const primary = user.emailAddresses.find(
        (e) => e.id === user.primaryEmailAddressId,
      );
      if (primary?.emailAddress) return primary.emailAddress;
    } catch {
      // fall through to DB email
    }
  }
  return partner.email;
}

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

  // Resolve the partner's current Clerk email once and use it everywhere.
  const partnerEmail = await getPartnerEmail(partner);
  const partnerWithClerkEmail = { ...partner, email: partnerEmail };

  const payload = buildLeadDeliveryPayload(delivery, lead, partnerWithClerkEmail);
  const leadTypeLabel =
    lead.leadType === "traditional_iul" ? "Traditional IUL" : "High Intent IUL";

  const deliveryChannel = filterSet?.deliveryChannel ?? "email";
  const crmProvider = partner.crmProvider;

  // Log the mode gate decision so every delivery run has a trace entry.
  await emitLeadEvent(lead.id, LeadEventType.delivered, {
    step: "mode_gate",
    mode,
    channel: deliveryChannel,
    crmProvider,
    deliveryId: leadDeliveryId,
  });

  if (mode === "mock") {
    await emitLeadEvent(lead.id, LeadEventType.delivered, {
      step: "mock_delivery",
      mock: true,
      deliveryId: leadDeliveryId,
      channel: deliveryChannel,
      toEmail: partnerEmail,
    });
    return {
      emailSent: true,
      crmPosted: crmProvider === "webhook" || deliveryChannel === "webhook",
      ringyPosted: crmProvider === "ringy" || deliveryChannel === "ringy",
      errors: [],
    };
  }

  // ── Ringy / Webhook delivery ────────────────────────────────────────────
  if (
    (crmProvider === "ringy" || deliveryChannel === "ringy") &&
    partner.ringySid
  ) {
    const ringyResult = await deliverToRingy(delivery, lead, partner);
    ringyPosted = ringyResult.success;

    if (ringyResult.success) {
      await emitLeadEvent(lead.id, LeadEventType.delivered, {
        step: "ringy",
        deliveryId: leadDeliveryId,
        statusCode: ringyResult.statusCode,
        responseBody: ringyResult.responseBody,
      });
    } else {
      const errMsg = ringyResult.error ?? "Ringy delivery failed";
      errors.push(errMsg);
      await emitLeadEvent(lead.id, LeadEventType.delivery_failed, {
        step: "ringy",
        deliveryId: leadDeliveryId,
        error: errMsg,
        statusCode: ringyResult.statusCode,
        responseBody: ringyResult.responseBody,
      });
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
      if (res.ok) {
        await emitLeadEvent(lead.id, LeadEventType.delivered, {
          step: "webhook",
          deliveryId: leadDeliveryId,
          statusCode: res.status,
          url: partner.crmWebhookUrl,
        });
      } else {
        const errMsg = `CRM webhook returned ${res.status}`;
        errors.push(errMsg);
        await emitLeadEvent(lead.id, LeadEventType.delivery_failed, {
          step: "webhook",
          deliveryId: leadDeliveryId,
          error: errMsg,
          statusCode: res.status,
          url: partner.crmWebhookUrl,
        });
      }
    } catch (err) {
      const errMsg = `CRM webhook failed: ${err instanceof Error ? err.message : "unknown"}`;
      errors.push(errMsg);
      await emitLeadEvent(lead.id, LeadEventType.delivery_failed, {
        step: "webhook",
        deliveryId: leadDeliveryId,
        error: errMsg,
        url: partner.crmWebhookUrl,
        errorDetail: err instanceof Error ? { name: err.name, message: err.message } : String(err),
      });
    }
  }

  // ── Email via Resend ────────────────────────────────────────────────────
  const resendKey = process.env.RESEND_API_KEY;

  if (
    resendKey &&
    (crmProvider === "email_only" || deliveryChannel === "email" || !crmPosted)
  ) {
    const resendMock = process.env.RESEND_MOCK === "true";
    const fromEmail = resendMock
      ? "onboarding@resend.dev"
      : process.env.FROM_EMAIL;

    if (!fromEmail) {
      // FROM_EMAIL is not configured and RESEND_MOCK is not enabled.
      const errMsg = "FROM_EMAIL not configured";
      errors.push(`Email skipped: ${errMsg}`);
      await emitLeadEvent(lead.id, LeadEventType.delivery_failed, {
        step: "resend",
        deliveryId: leadDeliveryId,
        error: errMsg,
        resendMock,
        toEmail: partnerEmail,
      });
    } else {
      const toEmail = partnerEmail;
      const subject = `New lead delivered — ${lead.state} ${leadTypeLabel}`;

      try {
        const { Resend } = await import("resend");
        const resend = new Resend(resendKey);

        const result = await resend.emails.send({
          from: fromEmail,
          to: toEmail,
          subject,
          html: buildLeadDeliveryEmailHtml(delivery, lead, partner),
        });

        if (result.error) {
          // Resend returned a structured error (non-throw path).
          const errMsg = result.error.message ?? "Resend returned an error";
          errors.push(`Email failed: ${errMsg}`);
          await emitLeadEvent(lead.id, LeadEventType.delivery_failed, {
            step: "resend",
            deliveryId: leadDeliveryId,
            from: fromEmail,
            to: toEmail,
            subject,
            resendMock,
            error: errMsg,
            resendError: result.error,
          });
        } else {
          emailSent = true;
          await emitLeadEvent(lead.id, LeadEventType.delivered, {
            step: "resend",
            deliveryId: leadDeliveryId,
            from: fromEmail,
            to: toEmail,
            subject,
            resendMock,
            resendMessageId: result.data?.id ?? null,
          });
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "unknown";
        errors.push(`Email failed: ${errMsg}`);
        await emitLeadEvent(lead.id, LeadEventType.delivery_failed, {
          step: "resend",
          deliveryId: leadDeliveryId,
          from: fromEmail,
          to: toEmail,
          subject,
          resendMock,
          error: errMsg,
          errorDetail: err instanceof Error ? { name: err.name, message: err.message } : String(err),
        });
      }
    }
  } else if (!resendKey) {
    await emitLeadEvent(lead.id, LeadEventType.delivery_failed, {
      step: "resend",
      deliveryId: leadDeliveryId,
      error: "RESEND_API_KEY not configured",
      toEmail: partnerEmail,
    });
    errors.push("Email skipped: RESEND_API_KEY not configured");
  }

  // ── Final summary event ─────────────────────────────────────────────────
  const finalEventType =
    errors.length > 0 ? LeadEventType.delivery_failed : LeadEventType.delivered;

  await emitLeadEvent(lead.id, finalEventType, {
    step: "summary",
    deliveryId: leadDeliveryId,
    emailSent,
    crmPosted,
    ringyPosted,
    errors,
    channel: deliveryChannel,
    crmProvider,
  });

  if (errors.length > 0) {
    await prisma.leadDelivery.update({
      where: { id: leadDeliveryId },
      data: { lastDeliveryError: errors.join("; ") },
    });
  }

  return { emailSent, crmPosted, ringyPosted, errors };
}
