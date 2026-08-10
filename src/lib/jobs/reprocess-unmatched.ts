import {
  reprocessUnmatchedLeadsWithCoordinator,
  type ReprocessJobResult,
} from "@/lib/lead-routing/coordinator";
import { prisma } from "@/lib/db";
import { getReprocessEligibility } from "@/lib/jobs/reprocess-eligibility";
import { isLeadHeldForReprocess } from "@/lib/jobs/reprocess-hold";
import {
  evaluateLifecyclePolicy,
  isPartnerPrimaryRoute,
} from "@/lib/lead-routing/policy";
import { getLifecycleSettings } from "@/lib/settings/app-settings";
import { ResaleStatus } from "@prisma/client";

export type { ReprocessJobResult } from "@/lib/lead-routing/coordinator";

/**
 * Combined unmatched-lead job — fair claim-based due queue.
 */
export async function reprocessUnmatchedLeads(): Promise<ReprocessJobResult> {
  return reprocessUnmatchedLeadsWithCoordinator();
}

export type ReprocessSingleLeadOptions = {
  includePartnerIds?: string[];
  mode?: "manual" | "cron";
};

async function resolveIntegrityPostingState(
  leadId: string,
): Promise<"none" | "pending" | "rejected" | "sold"> {
  const postings = await prisma.resalePosting.findMany({
    where: { leadId },
    orderBy: { postedAt: "desc" },
  });
  if (postings.some((p) => p.status === ResaleStatus.sold)) return "sold";
  if (postings.some((p) => p.status === ResaleStatus.pending)) return "pending";
  if (postings.some((p) => p.status === ResaleStatus.rejected)) return "rejected";
  return "none";
}

/** Whether the Partner picker should appear for these leads. */
export async function shouldShowPartnerPickerForLeads(
  leadIds: string[],
): Promise<boolean> {
  if (leadIds.length === 0) return false;
  const settings = await getLifecycleSettings();
  const leads = await prisma.lead.findMany({ where: { id: { in: leadIds } } });
  if (leads.length === 0) return false;

  const now = new Date();
  for (const lead of leads) {
    const ageHours =
      (now.getTime() - lead.receivedAt.getTime()) / (1000 * 60 * 60);
    const integrityPosting = await resolveIntegrityPostingState(lead.id);
    const policy = evaluateLifecyclePolicy({
      ageHours,
      liveSold: lead.liveSoldAt != null,
      integrityPosting,
      integrityBlocked: lead.integrityBlockedAt != null,
      settings,
    });
    if (!isPartnerPrimaryRoute(policy)) {
      return false;
    }
  }
  return true;
}

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

  if (
    (await isLeadHeldForReprocess(leadId)) &&
    !options?.includePartnerIds?.length &&
    mode !== "manual"
  ) {
    throw new Error("Lead is reserved for manual reprocessing");
  }

  const { executeLeadRouting } = await import("@/lib/lead-routing/coordinator");
  const result = await executeLeadRouting(leadId, {
    mode: mode === "manual" ? "manual" : "cron",
    includePartnerIds: options?.includePartnerIds,
    strictPartnerAllowlist: !!options?.includePartnerIds?.length,
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
