import { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { matchLead } from "@/lib/matching/engine";
import { integrityPostLead } from "@/lib/integrity/post";

const REPROCESS_WINDOW_HOURS = 24;

export interface ReprocessJobResult {
  attempted: number;
  matched: number;
  integrityQueued: number;
  errors: string[];
}

export async function reprocessUnmatchedLeads(): Promise<ReprocessJobResult> {
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - REPROCESS_WINDOW_HOURS);

  const leads = await prisma.lead.findMany({
    where: {
      status: LeadStatus.unmatched,
      available: true,
    },
    orderBy: { receivedAt: "asc" },
    take: 50,
  });

  let matched = 0;
  let integrityQueued = 0;
  const errors: string[] = [];

  for (const lead of leads) {
    try {
      if (lead.receivedAt > windowStart) {
        const result = await matchLead(lead.id);
        if (result.matched && result.deliveryId) {
          matched++;
        }
        continue;
      }

      const postResult = await integrityPostLead(lead.id);
      if (postResult.posted) {
        integrityQueued++;
      } else if (postResult.reason) {
        errors.push(`${lead.id}: ${postResult.reason}`);
      }
    } catch (err) {
      errors.push(
        `${lead.id}: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }
  }

  return {
    attempted: leads.length,
    matched,
    integrityQueued,
    errors,
  };
}

export async function reprocessSingleLead(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead not found");
  if (!lead.available || lead.status !== LeadStatus.unmatched) {
    throw new Error("Lead is not available for reprocessing");
  }

  const result = await matchLead(leadId);
  if (result.matched && result.deliveryId) {
    return result;
  }

  const postResult = await integrityPostLead(leadId);
  if (postResult.posted) {
    return { matched: false, lead, integrityPosted: true };
  }

  return { matched: false, lead, reason: result.reason ?? postResult.reason };
}
