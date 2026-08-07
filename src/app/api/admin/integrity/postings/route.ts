import { NextResponse } from "next/server";
import { LeadEventType } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const INTEGRITY_OUTCOME_EVENT_TYPES: LeadEventType[] = [
  LeadEventType.integrity_posted,
  LeadEventType.integrity_accepted,
  LeadEventType.integrity_rejected,
  LeadEventType.integrity_no_campaign,
  LeadEventType.integrity_error,
  LeadEventType.integrity_missing_fields,
];

function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

/**
 * GET /api/admin/integrity/postings
 * Returns the 50 most recent ResalePostings with basic lead info.
 */
export async function GET() {
  const adminCheck = await requireAdmin();
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: 403 });
  }

  const postings = await prisma.resalePosting.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
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

  const leadIds = [...new Set(postings.map((p) => p.leadId))];
  const postingIds = new Set(postings.map((p) => p.id));

  const rawEvents =
    leadIds.length > 0
      ? await prisma.leadEvent.findMany({
          where: {
            leadId: { in: leadIds },
            type: { in: INTEGRITY_OUTCOME_EVENT_TYPES },
          },
          orderBy: { createdAt: "asc" },
          select: { payload: true },
        })
      : [];

  const outcomeByPostingId = new Map<string, string>();
  for (const event of rawEvents) {
    const payload = asObject(event.payload);
    const postingId = payload?.postingId;
    if (typeof postingId !== "string" || !postingIds.has(postingId)) continue;
    if (typeof payload.outcome === "string") {
      outcomeByPostingId.set(postingId, payload.outcome);
    }
  }

  // Serialize dates and attach integrity outcome from lead events
  const rows = postings.map((p) => ({
    id: p.id,
    leadId: p.leadId,
    mode: p.mode,
    status: p.status,
    externalRef: p.externalRef ?? null,
    postedAt: p.postedAt ? p.postedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    lead: p.lead,
    rejectionReason: null as string | null,
    integrityOutcome: outcomeByPostingId.get(p.id) ?? null,
  }));

  return NextResponse.json({ postings: rows });
}
