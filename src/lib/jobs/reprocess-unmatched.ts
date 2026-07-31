import {
  LeadCategoryResolution,
  LeadEventType,
  LeadStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { emitLeadEvent } from "@/lib/leads/lead-events";
import { matchLead } from "@/lib/matching/engine";
import { integrityPostLead } from "@/lib/integrity/post";
import {
  getIntegrityPostDelayHours,
  isIntegrityReprocessEnabled,
} from "@/lib/settings/app-settings";
import { getReprocessEligibility } from "@/lib/jobs/reprocess-eligibility";
import { isLeadHeldForReprocess } from "@/lib/jobs/reprocess-hold";

export interface ReprocessJobResult {
  attempted: number;
  matched: number;
  integrityQueued: number;
  errors: string[];
  skipped?: string;
}

/**
 * Single combined job for unmatched leads, matching the documented design
 * (docs/BACKEND.md "Stratégie jobs planifiés"): leads unmatched for less
 * than the configured delay get a retry match attempt; leads unmatched for
 * longer than that are escalated to IntegrityCONNECT. One threshold
 * (the admin-configurable "Integrity unmatched delay" setting) governs both
 * sides of the cutoff so there's a single source of truth.
 *
 * Leads that are already matched/delivered, posted to Integrity, or sold on
 * the aged marketplace are never picked up here — they no longer satisfy
 * `status: unmatched, available: true`.
 */
export async function reprocessUnmatchedLeads(): Promise<ReprocessJobResult> {
  if (!(await isIntegrityReprocessEnabled())) {
    return { attempted: 0, matched: 0, integrityQueued: 0, errors: [], skipped: "disabled by admin setting" };
  }

  const delayHours = await getIntegrityPostDelayHours();
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - delayHours);

  const leads = await prisma.lead.findMany({
    where: {
      status: LeadStatus.unmatched,
      available: true,
      categoryResolution: LeadCategoryResolution.matched,
      leadType: { not: null },
    },
    orderBy: { receivedAt: "asc" },
    take: 50,
  });

  let matched = 0;
  let integrityQueued = 0;
  const errors: string[] = [];

  for (const lead of leads) {
    try {
      if (isLeadHeldForReprocess(lead.id)) {
        continue;
      }

      if (lead.receivedAt > windowStart) {
        const result = await matchLead(lead.id);
        if (result.matched && result.deliveryId) {
          matched++;
          await emitLeadEvent(lead.id, LeadEventType.reprocessed, {
            deliveryId: result.deliveryId,
            cron: true,
          });
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

export type ReprocessSingleLeadOptions = {
  includePartnerIds?: string[];
  mode?: "manual" | "cron";
};

export async function reprocessSingleLead(
  leadId: string,
  options?: ReprocessSingleLeadOptions,
) {
  const mode = options?.mode ?? "manual";

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead not found");

  const eligibility = getReprocessEligibility({
    available: lead.available,
    status: lead.status,
    categoryResolution: lead.categoryResolution,
    leadType: lead.leadType,
  });
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason ?? "Lead is not available for reprocessing");
  }

  if (isLeadHeldForReprocess(leadId) && !options?.includePartnerIds?.length) {
    throw new Error("Lead is reserved for manual reprocessing");
  }

  const result = await matchLead(leadId, {
    includePartnerIds: options?.includePartnerIds,
  });
  if (result.matched && result.deliveryId) {
    return result;
  }

  if (mode === "manual") {
    return { matched: false, lead, reason: result.reason };
  }

  const postResult = await integrityPostLead(leadId);
  if (postResult.posted) {
    return { matched: false, lead, integrityPosted: true };
  }

  return { matched: false, lead, reason: result.reason ?? postResult.reason };
}
