import { NextRequest, NextResponse } from "next/server";
import { LeadEventType, LeadStatus, ResaleMode, ResaleStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { emitLeadEvent } from "@/lib/leads/lead-events";
import { claimLiveSale } from "@/lib/lead-routing/live-sale";
import {
  classifyIntegrityFailure,
  formatIntegrityBlockReason,
} from "@/lib/integrity/classify";
import { isNoCampaignAvailableReason } from "@/lib/integrity/no-campaign";

/**
 * POST /api/webhooks/integrity
 *
 * Receives result callbacks from LeadConduit/Integrity after a lead is processed.
 * Validates INTEGRITY_WEBHOOK_SECRET via X-Api-Key header (same pattern as Stripe).
 *
 * Correlation strategy (in priority order):
 *   1. `postingId` query param  — set this in the LeadConduit callback URL:
 *      https://YOUR-DOMAIN/api/webhooks/integrity?postingId={{posting_id}}
 *      (where {{posting_id}} is the `reference` field value we send on submit)
 *   2. `posting_id` field in the JSON body
 *   3. `reference` field in the JSON body (echoed back by LeadConduit)
 *   4. Fallback: look up lead by `vendor_lead_id_thom` → latest pending posting
 *
 * Always returns HTTP 200 — LeadConduit requires 200 to mark delivery successful.
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.INTEGRITY_WEBHOOK_SECRET;
  if (webhookSecret) {
    const apiKey = request.headers.get("x-api-key");
    if (!apiKey || apiKey !== webhookSecret) {
      console.warn(
        "[integrity-webhook] Unauthorized callback — bad or missing X-Api-Key",
      );
      return NextResponse.json(
        { received: true, error: "Unauthorized" },
        { status: 200 },
      );
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    console.error("[integrity-webhook] Failed to parse request body");
    return NextResponse.json(
      { received: true, error: "Invalid JSON" },
      { status: 200 },
    );
  }

  const outcome = body.outcome as string | undefined;
  const leadData = body.lead as { id?: string } | undefined;
  const reason = body.reason as string | undefined;
  const externalLeadId = leadData?.id;

  const postingId =
    request.nextUrl.searchParams.get("postingId") ??
    (body.posting_id as string | undefined) ??
    (body.reference as string | undefined);

  let posting = postingId
    ? await prisma.resalePosting.findUnique({ where: { id: postingId } })
    : null;

  if (!posting) {
    const vendorLeadId = body.vendor_lead_id_thom as string | undefined;
    if (vendorLeadId) {
      const lead = await prisma.lead.findFirst({
        where: {
          OR: [{ externalId: vendorLeadId }, { id: vendorLeadId }],
        },
      });

      if (lead) {
        posting = await prisma.resalePosting.findFirst({
          where: { leadId: lead.id, status: ResaleStatus.pending },
          orderBy: { postedAt: "desc" },
        });
      }
    }
  }

  if (!posting) {
    console.warn(
      `[integrity-webhook] Could not resolve ResalePosting. postingId=${postingId ?? "none"}, vendor_lead_id_thom=${body.vendor_lead_id_thom ?? "none"}`,
    );
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const resolvedPostingId = posting.id;

  if (outcome === "success") {
    await prisma.resalePosting.update({
      where: { id: resolvedPostingId },
      data: {
        status: ResaleStatus.sold,
        externalRef: externalLeadId ?? posting.externalRef,
        soldAt: new Date(),
      },
    });

    const liveChannel =
      posting.mode === ResaleMode.storefront
        ? "integrity_storefront"
        : "integrity_realtime";
    await claimLiveSale(posting.leadId, liveChannel);

    await emitLeadEvent(posting.leadId, LeadEventType.integrity_accepted, {
      postingId: resolvedPostingId,
      externalLeadId,
      outcome: "accepted",
      response: body,
    });
  } else if (outcome === "failure") {
    await prisma.resalePosting.update({
      where: { id: resolvedPostingId },
      data: { status: ResaleStatus.rejected },
    });

    const failureClass = classifyIntegrityFailure({
      outcome: "failure",
      reason: reason ?? null,
    });
    const noCampaign =
      failureClass === "retryable_no_campaign" ||
      (reason != null && isNoCampaignAvailableReason(reason));

    if (failureClass === "terminal_business_rejection") {
      await prisma.lead.update({
        where: { id: posting.leadId },
        data: {
          integrityBlockedAt: new Date(),
          integrityBlockedReason: formatIntegrityBlockReason(reason),
          status: LeadStatus.unmatched,
          nextRoutingAttemptAt: new Date(),
        },
      });
    } else {
      // Retryable NCA / other — restore to unmatched queue
      await prisma.lead.updateMany({
        where: {
          id: posting.leadId,
          status: { in: [LeadStatus.integrity_posted, LeadStatus.unmatched] },
        },
        data: {
          status: LeadStatus.unmatched,
          nextRoutingAttemptAt: new Date(),
        },
      });
    }

    await emitLeadEvent(
      posting.leadId,
      noCampaign
        ? LeadEventType.integrity_no_campaign
        : LeadEventType.integrity_rejected,
      {
        postingId: resolvedPostingId,
        reason,
        outcome: noCampaign ? "no_campaign_available" : "rejected",
        failureClass,
        response: body,
      },
    );
  } else {
    console.error(
      `[integrity-webhook] Error outcome for posting ${resolvedPostingId}: ${reason}`,
    );

    await emitLeadEvent(posting.leadId, LeadEventType.integrity_error, {
      postingId: resolvedPostingId,
      outcome,
      reason,
      response: body,
    });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
