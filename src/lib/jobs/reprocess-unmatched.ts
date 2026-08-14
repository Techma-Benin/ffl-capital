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
import { LeadEventType, ResaleStatus } from "@prisma/client";
import { resolveIntegrityModeRejections } from "@/lib/integrity/rejection-state";
import type { IntegrityPostingStates } from "@/lib/lead-routing/types";

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

function resolveIntegrityPostingStates(
  postings: Array<{
    mode: "realtime" | "storefront";
    status: ResaleStatus;
  }>,
): IntegrityPostingStates {
  const resolveMode = (mode: "realtime" | "storefront") => {
    const modePostings = postings.filter((posting) => posting.mode === mode);
    if (modePostings.some((posting) => posting.status === ResaleStatus.sold)) return "sold";
    if (modePostings.some((posting) => posting.status === ResaleStatus.pending)) return "pending";
    if (modePostings.some((posting) => posting.status === ResaleStatus.rejected)) return "rejected";
    return "none";
  };
  return {
    realtime: resolveMode("realtime"),
    storefront: resolveMode("storefront"),
  };
}

/** Whether the Partner picker should appear for these leads. */
export async function shouldShowPartnerPickerForLeads(
  leadIds: string[],
): Promise<boolean> {
  if (leadIds.length === 0) return false;
  const settings = await getLifecycleSettings();
  const [leads, rejectionEvents] = await Promise.all([
    prisma.lead.findMany({
      where: { id: { in: leadIds } },
      include: {
        resalePostings: {
          select: { id: true, mode: true, status: true },
        },
      },
    }),
    prisma.leadEvent.findMany({
      where: {
        leadId: { in: leadIds },
        type: LeadEventType.integrity_rejected,
      },
      select: { leadId: true, payload: true },
    }),
  ]);
  if (leads.length === 0) return false;

  const rejectionEventsByLead = new Map<
    string,
    Array<(typeof rejectionEvents)[number]>
  >();
  for (const event of rejectionEvents) {
    const events = rejectionEventsByLead.get(event.leadId) ?? [];
    events.push(event);
    rejectionEventsByLead.set(event.leadId, events);
  }

  const now = new Date();
  for (const lead of leads) {
    const ageHours =
      (now.getTime() - lead.receivedAt.getTime()) / (1000 * 60 * 60);
    const integrityPostings = resolveIntegrityPostingStates(lead.resalePostings);
    const integrityBlockedModes = resolveIntegrityModeRejections(
      lead.resalePostings,
      rejectionEventsByLead.get(lead.id) ?? [],
    );
    const policy = evaluateLifecyclePolicy({
      ageHours,
      liveSold: lead.liveSoldAt != null,
      integrityPostings,
      integrityBlockedModes,
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
