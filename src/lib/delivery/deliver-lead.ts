import { LeadEventType } from "@prisma/client";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { emitLeadEvent } from "@/lib/leads/lead-events";
import { getIntegrationsMode } from "@/lib/settings/app-settings";
import {
  buildLeadDeliveryEmailHtml,
  buildLeadDeliveryPayload,
} from "./lead-payload";
import { postPartnerCrmOutbound } from "./outbound-http";
import { sendCrmOutboundFailureEmail } from "./crm-outbound-failure-email";
import { endpointHostForDisplay } from "./outbound-url-guard";

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
  crmOutboundPosted: boolean;
  errors: string[];
}

export async function deliverLead(leadDeliveryId: string): Promise<DeliverLeadResult> {
  const delivery = await prisma.leadDelivery.findUnique({
    where: { id: leadDeliveryId },
    include: {
      lead: true,
      partner: { include: { crmOutboundConfig: true } },
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
  let crmOutboundPosted = false;

  const partnerEmail = await getPartnerEmail(partner);
  const partnerWithClerkEmail = { ...partner, email: partnerEmail };

  const payload = buildLeadDeliveryPayload(delivery, lead, partnerWithClerkEmail);
  const leadTypeLabel =
    lead.leadType === "traditional_iul" ? "Traditional IUL" : "High Intent IUL";

  const crmConfig = partner.crmOutboundConfig;
  const crmEnabled = Boolean(crmConfig?.enabled);

  await emitLeadEvent(lead.id, LeadEventType.delivered, {
    step: "mode_gate",
    mode,
    crmOutboundEnabled: crmEnabled,
    deliveryId: leadDeliveryId,
    filterSetId: filterSet?.id ?? null,
  });

  if (mode === "mock") {
    await emitLeadEvent(lead.id, LeadEventType.delivered, {
      step: "mock_delivery",
      mock: true,
      deliveryId: leadDeliveryId,
      toEmail: partnerEmail,
      crmOutboundEnabled: crmEnabled,
    });
    return {
      emailSent: true,
      crmOutboundPosted: crmEnabled,
      errors: [],
    };
  }

  // ── Email via Resend (always) ───────────────────────────────────────────
  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey) {
    const resendMock = process.env.RESEND_MOCK === "true";
    const fromEmail = resendMock
      ? "onboarding@resend.dev"
      : process.env.FROM_EMAIL;

    if (!fromEmail) {
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
  } else {
    await emitLeadEvent(lead.id, LeadEventType.delivery_failed, {
      step: "resend",
      deliveryId: leadDeliveryId,
      error: "RESEND_API_KEY not configured",
      toEmail: partnerEmail,
    });
    errors.push("Email skipped: RESEND_API_KEY not configured");
  }

  // ── Optional CRM outbound POST ────────────────────────────────────────────
  if (crmConfig?.enabled) {
    const postResult = await postPartnerCrmOutbound(
      crmConfig,
      payload as Record<string, unknown>,
    );

    if (postResult.ok) {
      crmOutboundPosted = true;
      await emitLeadEvent(lead.id, LeadEventType.delivered, {
        step: "crm_outbound",
        deliveryId: leadDeliveryId,
        statusCode: postResult.statusCode,
        endpointHost: endpointHostForDisplay(crmConfig.endpointUrl),
        bodyPreview: postResult.bodyPreview,
      });
    } else {
      const errMsg = postResult.error ?? "CRM outbound failed";
      errors.push(errMsg);
      await emitLeadEvent(lead.id, LeadEventType.delivery_failed, {
        step: "crm_outbound",
        deliveryId: leadDeliveryId,
        error: errMsg,
        statusCode: postResult.statusCode,
        endpointHost: endpointHostForDisplay(crmConfig.endpointUrl),
        successRuleFailed: postResult.successRuleFailed,
      });

      const failureEmail = await sendCrmOutboundFailureEmail({
        toEmail: partnerEmail,
        leadId: lead.id,
        deliveryId: leadDeliveryId,
        endpointUrl: crmConfig.endpointUrl,
        statusCode: postResult.statusCode,
        errorMessage: errMsg,
      });

      if (!failureEmail.sent && failureEmail.error) {
        console.warn(
          `[deliverLead] CRM failure notice email not sent: ${failureEmail.error}`,
        );
      }
    }
  }

  const finalEventType =
    errors.length > 0 ? LeadEventType.delivery_failed : LeadEventType.delivered;

  await emitLeadEvent(lead.id, finalEventType, {
    step: "summary",
    deliveryId: leadDeliveryId,
    emailSent,
    crmOutboundPosted,
    errors,
    crmOutboundEnabled: crmEnabled,
  });

  if (errors.length > 0) {
    await prisma.leadDelivery.update({
      where: { id: leadDeliveryId },
      data: { lastDeliveryError: errors.join("; ") },
    });
  }

  return { emailSent, crmOutboundPosted, errors };
}
