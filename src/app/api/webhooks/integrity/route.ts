import { NextRequest, NextResponse } from "next/server";
import { LeadEventType, ResaleStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { emitLeadEvent } from "@/lib/leads/lead-events";

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
      // Return 200 to prevent LeadConduit retry storms on auth misconfiguration
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

  // Resolve postingId from multiple sources
  const postingId =
    request.nextUrl.searchParams.get("postingId") ??
    (body.posting_id as string | undefined) ??
    (body.reference as string | undefined);

  // Resolve the ResalePosting record
  let posting = postingId
    ? await prisma.resalePosting.findUnique({ where: { id: postingId } })
    : null;

  // Fallback: look up by vendor_lead_id_thom → lead → latest pending posting
  if (!posting) {
    const vendorLeadId = body.vendor_lead_id_thom as string | undefined;
    if (vendorLeadId) {
      // vendor_lead_id_thom is lead.externalId ?? lead.id
      const lead = await prisma.lead.findFirst({
        where: {
          OR: [
            { externalId: vendorLeadId },
            { id: vendorLeadId },
          ],
        },
      });

      if (lead) {
        // Find the most recent pending posting for this lead
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

    await emitLeadEvent(posting.leadId, LeadEventType.integrity_rejected, {
      postingId: resolvedPostingId,
      reason,
      outcome: "rejected",
      response: body,
    });
  } else {
    // "error" or unknown — log and leave pending for retry
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
