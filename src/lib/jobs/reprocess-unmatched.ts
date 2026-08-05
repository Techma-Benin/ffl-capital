import {
  reprocessUnmatchedLeadsWithCoordinator,
  type ReprocessJobResult,
} from "@/lib/lead-routing/coordinator";
import { matchLead } from "@/lib/matching/engine";
import { integrityPostLead } from "@/lib/integrity/post";
import { emitLeadEvent } from "@/lib/leads/lead-events";
import { LeadEventType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getReprocessEligibility } from "@/lib/jobs/reprocess-eligibility";
import { isLeadHeldForReprocess } from "@/lib/jobs/reprocess-hold";
import { isLifecycleRoutingEnabled } from "@/lib/settings/app-settings";

export type { ReprocessJobResult } from "@/lib/lead-routing/coordinator";

/**
 * Combined unmatched-lead job. When lifecycle routing is enabled, delegates to
 * the shared coordinator; otherwise preserves the legacy delay-based flow.
 */
export async function reprocessUnmatchedLeads(): Promise<ReprocessJobResult> {
  return reprocessUnmatchedLeadsWithCoordinator();
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

  if (await isLifecycleRoutingEnabled()) {
    const { executeLeadRouting } = await import("@/lib/lead-routing/coordinator");
    const result = await executeLeadRouting(leadId, {
      mode: mode === "manual" ? "manual" : "cron",
    });
    return {
      matched: result.action === "matched",
      lead,
      deliveryId: result.deliveryId,
      integrityPosted: result.action === "integrity_posted",
      reason: result.reason,
      phase: result.phase,
    };
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
