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
import {
  classifyIntegrityFailure,
  type IntegrityFailureClass,
} from "@/lib/integrity/classify";
import { getIntegrityModeRejections } from "@/lib/integrity/rejection-state";
import { matchLead } from "@/lib/matching/engine";
import {
  getLifecycleSettings,
  isIntegrityReprocessEnabled,
} from "@/lib/settings/app-settings";
import { isLeadHeldForReprocess } from "@/lib/jobs/reprocess-hold";
import { getRoutingQueueConfig } from "./config";
import {
  evaluateLifecyclePolicy,
  isPartnerPrimaryRoute,
} from "./policy";
import {
  computeNextRoutingAttempt,
  realtimeWindowEndsAt,
} from "./schedule";
import type {
  IntegrityBlockedModes,
  IntegrityPostingStates,
  LifecyclePolicyResult,
  LifecycleSettings,
  RoutingRoute,
} from "./types";
import {
  ROUTING_WINDOWS,
  claimDueLeadsPage,
  countDueLeads,
  mapWithConcurrency,
  releaseRoutingClaim,
  type DueWindowKey,
  type WindowDrainStats,
} from "./work-queue";

export interface RoutingExecutionResult {
  action:
    | "matched"
    | "integrity_posted"
    | "skipped"
    | "waiting"
    | "none"
    | "blocked";
  phase?: string;
  reason?: string;
  deliveryId?: string;
  postingId?: string;
  integrityClass?: IntegrityFailureClass;
}

export type ExecuteLeadRoutingOptions = {
  now?: Date;
  mode?: "intake" | "cron" | "manual";
  includePartnerIds?: string[];
  /** When true with partner selection, never fall back to Storefront. */
  strictPartnerAllowlist?: boolean;
  claimToken?: string;
};

function hoursSince(date: Date, now: Date): number {
  return (now.getTime() - date.getTime()) / (1000 * 60 * 60);
}

async function resolveIntegrityPostingStates(
  leadId: string,
): Promise<IntegrityPostingStates> {
  const postings = await prisma.resalePosting.findMany({
    where: { leadId },
    orderBy: { postedAt: "desc" },
  });

  const resolveMode = (mode: ResaleMode) => {
    const modePostings = postings.filter((posting) => posting.mode === mode);
    if (modePostings.some((posting) => posting.status === ResaleStatus.sold)) return "sold";
    if (modePostings.some((posting) => posting.status === ResaleStatus.pending)) return "pending";
    if (modePostings.some((posting) => posting.status === ResaleStatus.rejected)) return "rejected";
    return "none";
  };

  return {
    realtime: resolveMode(ResaleMode.realtime),
    storefront: resolveMode(ResaleMode.storefront),
  };
}

export async function previewLeadRouting(input: {
  ageHours: number;
  liveSold: boolean;
  integrityPosting: "none" | "pending" | "rejected" | "sold";
  integrityBlocked?: boolean;
}): Promise<LifecyclePolicyResult & { preview: true; externalRequestSent: false }> {
  const settings = await getLifecycleSettings();
  const result = evaluateLifecyclePolicy({
    ageHours: input.ageHours,
    liveSold: input.liveSold,
    integrityPostings: {
      realtime: input.integrityPosting,
      storefront: input.integrityPosting,
    },
    integrityBlockedModes: {
      realtime: input.integrityBlocked ?? false,
      storefront: input.integrityBlocked ?? false,
    },
    settings,
  });
  return { preview: true, externalRequestSent: false, ...result };
}

async function persistSchedule(
  leadId: string,
  schedule: {
    lastRoutingAttemptAt: Date;
    nextRoutingAttemptAt: Date | null;
    routingAttemptCount: number;
  },
): Promise<void> {
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      lastRoutingAttemptAt: schedule.lastRoutingAttemptAt,
      nextRoutingAttemptAt: schedule.nextRoutingAttemptAt,
      routingAttemptCount: schedule.routingAttemptCount,
    },
  });
}

async function recordAttemptAndBackoff(input: {
  leadId: string;
  lead: { receivedAt: Date; routingAttemptCount: number };
  now: Date;
  settings: LifecycleSettings;
  kind:
    | "partner_miss"
    | "no_campaign"
    | "operational"
    | "integrity_blocked_wait"
    | "waiting_pending"
    | "immediate"
    | "clear";
  hardCutoffAt?: Date | null;
}): Promise<void> {
  const schedule = computeNextRoutingAttempt({
    now: input.now,
    receivedAt: input.lead.receivedAt,
    attemptCountAfter: input.lead.routingAttemptCount + 1,
    kind: input.kind,
    settings: input.settings,
    hardCutoffAt: input.hardCutoffAt,
  });
  await persistSchedule(input.leadId, schedule);
}

async function executeRoute(
  leadId: string,
  route: RoutingRoute,
  options?: { includePartnerIds?: string[] },
): Promise<RoutingExecutionResult> {
  if (route === "partner") {
    const result = await matchLead(leadId, {
      includePartnerIds: options?.includePartnerIds,
    });
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
      integrityClass: postResult.failureClass,
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
      integrityClass: postResult.failureClass,
    };
  }

  return { action: "skipped", reason: "Aged marketplace routing is passive" };
}

function isDefinitiveFailure(result: RoutingExecutionResult): boolean {
  return result.action === "none" && !!result.reason;
}

function classifyPartnerMissReason(reason: string | undefined): boolean {
  if (!reason) return false;
  return /no eligible partner|no matching partner|no partner/i.test(reason);
}

/**
 * Executes one routing step for a lead.
 * Lifecycle off = Partner-only (never Integrity). Lifecycle on = age windows.
 */
export async function executeLeadRouting(
  leadId: string,
  options?: ExecuteLeadRoutingOptions,
): Promise<RoutingExecutionResult> {
  const now = options?.now ?? new Date();
  const mode = options?.mode ?? "cron";
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

  if (mode !== "manual" && (await isLeadHeldForReprocess(leadId))) {
    return { action: "skipped", reason: "Lead held for manual reprocess" };
  }

  if (mode === "cron" && !(await isIntegrityReprocessEnabled())) {
    return { action: "skipped", reason: "Automated reprocessing disabled" };
  }

  const [integrityPostings, integrityBlockedModes] = await Promise.all([
    resolveIntegrityPostingStates(leadId),
    getIntegrityModeRejections(leadId),
  ]);
  const ageHours = hoursSince(lead.receivedAt, now);

  const policy = evaluateLifecyclePolicy({
    ageHours,
    liveSold: lead.liveSoldAt != null,
    integrityPostings,
    integrityBlockedModes,
    settings,
  });

  if (policy.phase === "live_sold" || policy.phase === "aged_marketplace") {
    await recordAttemptAndBackoff({
      leadId,
      lead,
      now,
      settings,
      kind: "clear",
    });
    return {
      action: "skipped",
      phase: policy.phase,
      reason: `No automatic live routing in ${policy.phase} phase`,
    };
  }

  // 48h–30d automatic partner gate (manual still allowed)
  if (
    policy.phase === "partners_only" &&
    mode === "cron" &&
    !settings.partnerAutoReprocessEnabled
  ) {
    return {
      action: "skipped",
      phase: policy.phase,
      reason:
        "Automatic partner reprocessing after 48h is disabled — manual only",
    };
  }

  if (policy.phase === "waiting") {
    const kind =
      integrityBlockedModes.realtime && ageHours < settings.realtimeCutoffHours
        ? "integrity_blocked_wait"
        : "waiting_pending";
    await recordAttemptAndBackoff({
      leadId,
      lead,
      now,
      settings,
      kind,
    });
    return {
      action: "waiting",
      phase: policy.phase,
      reason: policy.reason,
    };
  }

  // Manual strict partner allowlist when Partner is the active primary route
  const useStrictPartners =
    mode === "manual" &&
    !!options?.includePartnerIds?.length &&
    (options.strictPartnerAllowlist !== false) &&
    isPartnerPrimaryRoute(policy);

  if (useStrictPartners) {
    const primaryResult = await executeRoute(leadId, "partner", {
      includePartnerIds: options!.includePartnerIds,
    });
    if (primaryResult.action === "matched") {
      await recordAttemptAndBackoff({
        leadId,
        lead,
        now,
        settings,
        kind: "clear",
      });
      return { ...primaryResult, phase: policy.phase };
    }
    await recordAttemptAndBackoff({
      leadId,
      lead,
      now,
      settings,
      kind: "partner_miss",
    });
    return {
      ...primaryResult,
      phase: policy.phase,
      reason:
        primaryResult.reason ??
        "Selected partners failed — stopped without Storefront fallback",
    };
  }

  if (!policy.primaryRoute) {
    return {
      action: "skipped",
      phase: policy.phase,
      reason: policy.reason,
    };
  }

  const primaryResult = await executeRoute(leadId, policy.primaryRoute, {
    includePartnerIds:
      policy.primaryRoute === "partner" ? options?.includePartnerIds : undefined,
  });

  if (
    primaryResult.action === "matched" ||
    primaryResult.action === "integrity_posted"
  ) {
    await recordAttemptAndBackoff({
      leadId,
      lead,
      now,
      settings,
      kind: "clear",
    });
    return { ...primaryResult, phase: policy.phase };
  }

  // Integrity failure classification → schedule / block
  if (
    (policy.primaryRoute === "integrity_realtime" ||
      policy.primaryRoute === "integrity_storefront") &&
    primaryResult.action === "none"
  ) {
    const failureClass =
      primaryResult.integrityClass ??
      classifyIntegrityFailure({ reason: primaryResult.reason });

    if (failureClass === "retryable_no_campaign") {
      await recordAttemptAndBackoff({
        leadId,
        lead,
        now,
        settings,
        kind: "no_campaign",
        hardCutoffAt: realtimeWindowEndsAt(lead.receivedAt, settings),
      });
      return {
        ...primaryResult,
        phase: policy.phase,
        integrityClass: failureClass,
      };
    }

    if (failureClass === "operational_failure") {
      await recordAttemptAndBackoff({
        leadId,
        lead,
        now,
        settings,
        kind: "operational",
      });
      return {
        ...primaryResult,
        phase: policy.phase,
        integrityClass: failureClass,
      };
    }

    // Terminal business rejection already persisted on post; schedule partner window
    if (failureClass === "terminal_business_rejection") {
      await recordAttemptAndBackoff({
        leadId,
        lead,
        now,
        settings,
        kind: "integrity_blocked_wait",
      });
      if (!policy.fallbackRoute) {
        return {
          ...primaryResult,
          phase: policy.phase,
          integrityClass: failureClass,
        };
      }
      // Continue to fallback if available (mid-window partner)
    }
  }

  const allowFallback =
    policy.fallbackRoute &&
    isDefinitiveFailure(primaryResult) &&
    !(
      policy.fallbackRoute === "integrity_realtime" &&
      integrityPostings.realtime === "pending"
    ) &&
    !(
      policy.fallbackRoute === "integrity_storefront" &&
      integrityPostings.storefront === "pending"
    ) &&
    !(mode === "manual" && options?.strictPartnerAllowlist && options.includePartnerIds?.length);

  if (allowFallback && policy.fallbackRoute) {
    // Skip only the rejected Integrity mode; the other mode stays eligible.
    if (
      (policy.fallbackRoute === "integrity_realtime" &&
        integrityBlockedModes.realtime) ||
      (policy.fallbackRoute === "integrity_storefront" &&
        integrityBlockedModes.storefront)
    ) {
      await recordAttemptAndBackoff({
        leadId,
        lead,
        now,
        settings,
        kind: "partner_miss",
      });
      return { ...primaryResult, phase: policy.phase };
    }

    const fallbackResult = await executeRoute(leadId, policy.fallbackRoute, {
      includePartnerIds:
        policy.fallbackRoute === "partner"
          ? options?.includePartnerIds
          : undefined,
    });

    if (
      fallbackResult.action === "matched" ||
      fallbackResult.action === "integrity_posted"
    ) {
      await recordAttemptAndBackoff({
        leadId,
        lead,
        now,
        settings,
        kind: "clear",
      });
      return { ...fallbackResult, phase: policy.phase };
    }

    if (
      policy.fallbackRoute === "partner" &&
      classifyPartnerMissReason(fallbackResult.reason)
    ) {
      await recordAttemptAndBackoff({
        leadId,
        lead,
        now,
        settings,
        kind: "partner_miss",
      });
    } else if (fallbackResult.action === "none") {
      await recordAttemptAndBackoff({
        leadId,
        lead,
        now,
        settings,
        kind: "partner_miss",
      });
    }

    return { ...fallbackResult, phase: policy.phase };
  }

  if (
    policy.primaryRoute === "partner" &&
    classifyPartnerMissReason(primaryResult.reason)
  ) {
    await recordAttemptAndBackoff({
      leadId,
      lead,
      now,
      settings,
      kind: "partner_miss",
    });
  } else if (primaryResult.action === "none") {
    await recordAttemptAndBackoff({
      leadId,
      lead,
      now,
      settings,
      kind: "partner_miss",
    });
  }

  return { ...primaryResult, phase: policy.phase };
}

export interface ReprocessJobResult {
  attempted: number;
  matched: number;
  integrityQueued: number;
  waiting: number;
  blocked: number;
  throttled: boolean;
  pages: number;
  neverAttempted: number;
  retries: number;
  remainingDue: number;
  elapsedMs: number;
  attemptedByWindow: Record<DueWindowKey, number>;
  errors: string[];
  skipped?: string;
}

/**
 * Fair, claim-based unmatched-lead drain across independent age windows.
 */
export async function reprocessUnmatchedLeadsWithCoordinator(
  now = new Date(),
): Promise<ReprocessJobResult> {
  const settings = await getLifecycleSettings();
  const empty: ReprocessJobResult = {
    attempted: 0,
    matched: 0,
    integrityQueued: 0,
    waiting: 0,
    blocked: 0,
    throttled: false,
    pages: 0,
    neverAttempted: 0,
    retries: 0,
    remainingDue: 0,
    elapsedMs: 0,
    attemptedByWindow: { realtime: 0, mid: 0, partners_only: 0 },
    errors: [],
  };

  if (!(await isIntegrityReprocessEnabled())) {
    return { ...empty, skipped: "disabled by admin setting" };
  }

  const config = getRoutingQueueConfig();
  const claimToken = `cron:${process.pid}:${now.getTime()}`;
  const started = Date.now();

  let matched = 0;
  let integrityQueued = 0;
  let waiting = 0;
  let blocked = 0;
  let attempted = 0;
  let pages = 0;
  let neverAttempted = 0;
  let retries = 0;
  let throttled = false;
  const attemptedByWindow: Record<DueWindowKey, number> = {
    realtime: 0,
    mid: 0,
    partners_only: 0,
  };
  const errors: string[] = [];
  const windowStats: WindowDrainStats[] = [];

  // Skip partners_only window entirely when auto reprocess is off
  const windows: DueWindowKey[] =
    settings.partnerAutoReprocessEnabled
      ? [...ROUTING_WINDOWS]
      : ROUTING_WINDOWS.filter((w) => w !== "partners_only");

  for (const window of windows) {
    if (Date.now() - started >= config.runtimeBudgetMs) {
      throttled = true;
      break;
    }

    let windowPages = 0;
    let windowClaimed = 0;
    let windowNever = 0;
    let windowRetries = 0;

    // Drain this window independently so another window cannot starve it
    for (;;) {
      if (Date.now() - started >= config.runtimeBudgetMs) {
        throttled = true;
        break;
      }

      const { claimed, stats } = await claimDueLeadsPage({
        window,
        settings,
        claimToken,
        now,
        take: config.pageSize,
      });

      if (claimed.length === 0) break;

      windowPages++;
      pages++;
      windowClaimed += claimed.length;
      windowNever += stats.neverAttempted;
      windowRetries += stats.retries;
      neverAttempted += stats.neverAttempted;
      retries += stats.retries;
      attemptedByWindow[window] += claimed.length;

      const results = await mapWithConcurrency(
        claimed,
        config.concurrency,
        async (lead) => {
          try {
            const result = await executeLeadRouting(lead.id, {
              now,
              mode: "cron",
              claimToken,
            });
            return { leadId: lead.id, result };
          } catch (err) {
            return {
              leadId: lead.id,
              result: null as RoutingExecutionResult | null,
              error: err instanceof Error ? err.message : "unknown error",
            };
          } finally {
            await releaseRoutingClaim(lead.id, claimToken);
          }
        },
      );

      for (const row of results) {
        attempted++;
        if (row.error) {
          errors.push(`${row.leadId}: ${row.error}`);
          continue;
        }
        const result = row.result!;
        if (result.action === "matched") matched++;
        else if (result.action === "integrity_posted") integrityQueued++;
        else if (result.action === "waiting") waiting++;
        else if (result.action === "blocked") blocked++;
        else if (result.reason && result.action === "none") {
          errors.push(`${row.leadId}: ${result.reason}`);
        }
      }

      // Full page suggests more work; empty/partial ends the window drain
      if (claimed.length < config.pageSize) break;
    }

    const remainingDue = await countDueLeads(window, settings, now);
    windowStats.push({
      window,
      pages: windowPages,
      claimed: windowClaimed,
      neverAttempted: windowNever,
      retries: windowRetries,
      remainingDue,
    });
  }

  let remainingDue = 0;
  for (const w of windows) {
    remainingDue += await countDueLeads(w, settings, now);
  }

  const elapsedMs = Date.now() - started;
  console.info(
    JSON.stringify({
      msg: "reprocess_unmatched_complete",
      attempted,
      matched,
      integrityQueued,
      waiting,
      blocked,
      pages,
      neverAttempted,
      retries,
      remainingDue,
      throttled,
      elapsedMs,
      attemptedByWindow,
      windowStats,
      errorCount: errors.length,
    }),
  );

  return {
    attempted,
    matched,
    integrityQueued,
    waiting,
    blocked,
    throttled,
    pages,
    neverAttempted,
    retries,
    remainingDue,
    elapsedMs,
    attemptedByWindow,
    errors,
  };
}
