import {
  LeadCategoryResolution,
  LeadEventType,
  LeadStatus,
  ResaleMode,
  ResaleStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { emitLeadEvent } from "@/lib/leads/lead-events";
import { integrityPostLead } from "@/lib/integrity/post";
import { matchLead } from "@/lib/matching/engine";
import {
  getIntegrityPostDelayHours,
  getLifecycleSettings,
  isIntegrityReprocessEnabled,
} from "@/lib/settings/app-settings";
import { isLeadHeldForReprocess } from "@/lib/jobs/reprocess-hold";
import { evaluateLifecyclePolicy } from "./policy";
import type {
  IntegrityPostingState,
  LifecyclePolicyResult,
  RoutingRoute,
} from "./types";

export interface RoutingExecutionResult {
  action: "matched" | "integrity_posted" | "skipped" | "waiting" | "none";
  phase?: string;
  reason?: string;
  deliveryId?: string;
  postingId?: string;
}

function hoursSince(date: Date, now: Date): number {
  return (now.getTime() - date.getTime()) / (1000 * 60 * 60);
}

async function resolveIntegrityPostingState(
  leadId: string,
): Promise<IntegrityPostingState> {
  const postings = await prisma.resalePosting.findMany({
    where: { leadId },
    orderBy: { postedAt: "desc" },
  });

  if (postings.some((p) => p.status === ResaleStatus.sold)) {
    return "sold";
  }
  if (postings.some((p) => p.status === ResaleStatus.pending)) {
    return "pending";
  }
  if (postings.some((p) => p.status === ResaleStatus.rejected)) {
    return "rejected";
  }
  return "none";
}

export async function previewLeadRouting(input: {
  ageHours: number;
  liveSold: boolean;
  integrityPosting: IntegrityPostingState;
}): Promise<LifecyclePolicyResult & { preview: true; externalRequestSent: false }> {
  const settings = await getLifecycleSettings();
  const result = evaluateLifecyclePolicy({
    ...input,
    settings,
  });
  return { preview: true, externalRequestSent: false, ...result };
}

async function executeRoute(
  leadId: string,
  route: RoutingRoute,
): Promise<RoutingExecutionResult> {
  if (route === "partner") {
    const result = await matchLead(leadId);
    if (result.matched && result.deliveryId) {
      await emitLeadEvent(leadId, LeadEventType.reprocessed, {
        route: "partner",
        deliveryId: result.deliveryId,
      });
      return {
        action: "matched",
        deliveryId: result.deliveryId,
      };
    }
    return {
      action: "none",
      reason: result.reason ?? "No eligible partner found",
    };
  }

  if (route === "integrity_realtime") {
    const postResult = await integrityPostLead(leadId, {
      mode: ResaleMode.realtime,
    });
    if (postResult.posted) {
      return {
        action: "integrity_posted",
        postingId: postResult.postingId,
      };
    }
    return {
      action: "none",
      reason: postResult.reason ?? "Integrity realtime post failed",
    };
  }

  if (route === "integrity_storefront") {
    const postResult = await integrityPostLead(leadId, {
      mode: ResaleMode.storefront,
    });
    if (postResult.posted) {
      return {
        action: "integrity_posted",
        postingId: postResult.postingId,
      };
    }
    return {
      action: "none",
      reason: postResult.reason ?? "Integrity storefront post failed",
    };
  }

  return { action: "skipped", reason: "Aged marketplace routing is passive" };
}

function isDefinitiveFailure(result: RoutingExecutionResult): boolean {
  return result.action === "none" && !!result.reason;
}

/**
 * Executes one routing step for a lead using the lifecycle policy when enabled,
 * or the legacy delay-based match/Integrity flow when disabled.
 */
export async function executeLeadRouting(
  leadId: string,
  options?: { now?: Date; mode?: "intake" | "cron" | "manual" },
): Promise<RoutingExecutionResult> {
  const now = options?.now ?? new Date();
  const settings = await getLifecycleSettings();

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return { action: "skipped", reason: "Lead not found" };
  }

  if (
    !lead.available ||
    lead.status !== LeadStatus.unmatched ||
    lead.categoryResolution !== LeadCategoryResolution.matched ||
    !lead.leadType
  ) {
    return { action: "skipped", reason: "Lead not eligible for routing" };
  }

  if (isLeadHeldForReprocess(leadId) && options?.mode !== "manual") {
    return { action: "skipped", reason: "Lead held for manual reprocess" };
  }

  if (!settings.enabled) {
    if (!(await isIntegrityReprocessEnabled())) {
      return { action: "skipped", reason: "Automated reprocessing disabled" };
    }

    const delayHours = await getIntegrityPostDelayHours();
    const windowStart = new Date(now);
    windowStart.setHours(windowStart.getHours() - delayHours);

    if (lead.receivedAt > windowStart) {
      const result = await matchLead(leadId);
      if (result.matched && result.deliveryId) {
        return { action: "matched", deliveryId: result.deliveryId };
      }
      return { action: "none", reason: result.reason };
    }

    const postResult = await integrityPostLead(leadId);
    if (postResult.posted) {
      return { action: "integrity_posted", postingId: postResult.postingId };
    }
    return { action: "none", reason: postResult.reason };
  }

  const integrityPosting = await resolveIntegrityPostingState(leadId);
  const policy = evaluateLifecyclePolicy({
    ageHours: hoursSince(lead.receivedAt, now),
    liveSold: lead.liveSoldAt != null,
    integrityPosting,
    settings,
  });

  if (policy.phase === "live_sold" || policy.phase === "aged_marketplace") {
    return {
      action: "skipped",
      phase: policy.phase,
      reason: `No automatic live routing in ${policy.phase} phase`,
    };
  }

  if (policy.phase === "waiting") {
    return {
      action: "waiting",
      phase: policy.phase,
      reason: policy.reason,
    };
  }

  if (!policy.primaryRoute) {
    return {
      action: "skipped",
      phase: policy.phase,
      reason: policy.reason,
    };
  }

  const primaryResult = await executeRoute(leadId, policy.primaryRoute);
  if (
    primaryResult.action === "matched" ||
    primaryResult.action === "integrity_posted"
  ) {
    return { ...primaryResult, phase: policy.phase };
  }

  if (
    policy.fallbackRoute &&
    isDefinitiveFailure(primaryResult) &&
    integrityPosting !== "pending"
  ) {
    const fallbackResult = await executeRoute(leadId, policy.fallbackRoute);
    return { ...fallbackResult, phase: policy.phase };
  }

  return { ...primaryResult, phase: policy.phase };
}

export interface ReprocessJobResult {
  attempted: number;
  matched: number;
  integrityQueued: number;
  waiting: number;
  errors: string[];
  skipped?: string;
}

export async function reprocessUnmatchedLeadsWithCoordinator(
  now = new Date(),
): Promise<ReprocessJobResult> {
  const settings = await getLifecycleSettings();
  if (!settings.enabled && !(await isIntegrityReprocessEnabled())) {
    return {
      attempted: 0,
      matched: 0,
      integrityQueued: 0,
      waiting: 0,
      errors: [],
      skipped: "disabled by admin setting",
    };
  }

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
  let waiting = 0;
  const errors: string[] = [];

  for (const lead of leads) {
    try {
      const result = await executeLeadRouting(lead.id, { now, mode: "cron" });
      if (result.action === "matched") matched++;
      else if (result.action === "integrity_posted") integrityQueued++;
      else if (result.action === "waiting") waiting++;
      else if (result.reason && result.action === "none") {
        errors.push(`${lead.id}: ${result.reason}`);
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
    waiting,
    errors,
  };
}
