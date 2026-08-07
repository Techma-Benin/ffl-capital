import { NextResponse } from "next/server";
import { LeadEventType } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const INTEGRITY_EVENT_TYPES: LeadEventType[] = [
  LeadEventType.integrity_posted,
  LeadEventType.integrity_accepted,
  LeadEventType.integrity_rejected,
  LeadEventType.integrity_no_campaign,
  LeadEventType.integrity_error,
  LeadEventType.integrity_missing_fields,
];

type EventPayload = Record<string, unknown> | null;

function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function eventMatchesPosting(payload: EventPayload, postingId: string): boolean {
  if (!payload) return false;
  return payload.postingId === postingId;
}

/**
 * GET /api/admin/integrity/postings/[id]
 * Returns posting summary plus Integrity lead events (payloads / outcomes).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminCheck = await requireAdmin();
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: 403 });
  }

  const { id } = await context.params;

  const posting = await prisma.resalePosting.findUnique({
    where: { id },
    select: {
      id: true,
      leadId: true,
      mode: true,
      status: true,
      externalRef: true,
      postedAt: true,
      createdAt: true,
      lead: {
        select: {
          firstName: true,
          lastName: true,
          state: true,
          leadType: true,
        },
      },
    },
  });

  if (!posting) {
    return NextResponse.json({ error: "Posting not found" }, { status: 404 });
  }

  const rawEvents = await prisma.leadEvent.findMany({
    where: {
      leadId: posting.leadId,
      type: { in: INTEGRITY_EVENT_TYPES },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      type: true,
      payload: true,
      createdAt: true,
    },
  });

  const events = rawEvents
    .map((event) => ({
      id: event.id,
      type: event.type,
      payload: asObject(event.payload),
      createdAt: event.createdAt.toISOString(),
    }))
    .filter((event) => eventMatchesPosting(event.payload, posting.id));

  let rejectionReason: string | null = null;
  let requestPayload: Record<string, unknown> | null = null;
  let response: unknown = null;
  let outcome: string | null = null;

  for (const event of events) {
    const payload = event.payload;
    if (!payload) continue;

    if (payload.requestPayload && typeof payload.requestPayload === "object") {
      requestPayload = payload.requestPayload as Record<string, unknown>;
    }

    if (payload.response !== undefined) {
      response = payload.response;
    }

    if (typeof payload.outcome === "string") {
      outcome = payload.outcome;
    } else if (event.type === LeadEventType.integrity_accepted) {
      outcome = "accepted";
    } else if (event.type === LeadEventType.integrity_posted) {
      outcome = "posted";
    } else if (event.type === LeadEventType.integrity_no_campaign) {
      outcome = "no_campaign_available";
    }
  }

  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    const reason = event.payload?.reason;
    if (
      typeof reason === "string" &&
      (event.type === LeadEventType.integrity_rejected ||
        event.type === LeadEventType.integrity_no_campaign ||
        event.type === LeadEventType.integrity_missing_fields ||
        event.type === LeadEventType.integrity_error)
    ) {
      rejectionReason = reason;
      break;
    }
  }

  return NextResponse.json({
    posting: {
      id: posting.id,
      leadId: posting.leadId,
      mode: posting.mode,
      status: posting.status,
      externalRef: posting.externalRef ?? null,
      postedAt: posting.postedAt ? posting.postedAt.toISOString() : null,
      createdAt: posting.createdAt.toISOString(),
      lead: posting.lead,
      rejectionReason,
    },
    integrity: {
      outcome,
      requestPayload,
      response,
      events,
    },
  });
}
