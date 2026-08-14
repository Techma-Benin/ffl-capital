import {
  LeadCategoryResolution,
  LeadStatus,
  type Lead,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { getRoutingQueueConfig } from "./config";
import type { LifecycleSettings, RoutingAgeWindow } from "./types";

export type DueWindowKey = RoutingAgeWindow;

export type ClaimedLead = Pick<
  Lead,
  | "id"
  | "receivedAt"
  | "lastRoutingAttemptAt"
  | "nextRoutingAttemptAt"
  | "routingAttemptCount"
  | "liveSoldAt"
  | "status"
  | "available"
>;

export type WindowDrainStats = {
  window: DueWindowKey;
  pages: number;
  claimed: number;
  neverAttempted: number;
  retries: number;
  remainingDue: number;
};

function receivedAtBounds(
  window: DueWindowKey,
  settings: LifecycleSettings,
  now: Date,
): { gte?: Date; lt?: Date; gt?: Date; lte?: Date } {
  const realtimeMs = settings.realtimeCutoffHours * 60 * 60 * 1000;
  const storefrontMs = settings.storefrontCutoffHours * 60 * 60 * 1000;
  const agedMs = settings.agedDaysThreshold * 24 * 60 * 60 * 1000;

  switch (window) {
    case "realtime":
      return { gt: new Date(now.getTime() - realtimeMs) };
    case "mid":
      return {
        gt: new Date(now.getTime() - storefrontMs),
        lte: new Date(now.getTime() - realtimeMs),
      };
    case "partners_only":
      return {
        gt: new Date(now.getTime() - agedMs),
        lte: new Date(now.getTime() - storefrontMs),
      };
  }
}

/** Exported for unit tests. */
export function receivedAtBoundsForWindow(
  window: DueWindowKey,
  settings: LifecycleSettings,
  now: Date,
) {
  return receivedAtBounds(window, settings, now);
}

export type DueLeadSortKey = {
  id: string;
  lastRoutingAttemptAt: Date | null;
  nextRoutingAttemptAt: Date | null;
  routingAttemptCount: number;
};

/** Exported for unit tests — never-attempted first, then oldest due, then id. */
export function sortDueLeadsFairly<T extends DueLeadSortKey>(leads: T[]): T[] {
  return [...leads].sort((a, b) => {
    const aNever = a.lastRoutingAttemptAt == null && a.routingAttemptCount === 0;
    const bNever = b.lastRoutingAttemptAt == null && b.routingAttemptCount === 0;
    if (aNever !== bNever) return aNever ? -1 : 1;

    const aDue = a.nextRoutingAttemptAt?.getTime() ?? 0;
    const bDue = b.nextRoutingAttemptAt?.getTime() ?? 0;
    if (aDue !== bDue) return aDue - bDue;

    return a.id.localeCompare(b.id);
  });
}

function baseDueWhere(now: Date, window: DueWindowKey, settings: LifecycleSettings) {
  const bounds = receivedAtBounds(window, settings, now);
  return {
    status: LeadStatus.unmatched,
    available: true,
    categoryResolution: LeadCategoryResolution.matched,
    leadType: { not: null },
    liveSoldAt: null,
    AND: [
      {
        OR: [
          { nextRoutingAttemptAt: null },
          { nextRoutingAttemptAt: { lte: now } },
        ],
      },
      {
        OR: [
          { routingClaimExpiresAt: null },
          { routingClaimExpiresAt: { lt: now } },
        ],
      },
      { receivedAt: bounds },
    ],
  };
}

/**
 * Fetch one page of due leads for a single age window.
 * Never-attempted first, then oldest nextRoutingAttemptAt, then id.
 */
export async function findDueLeadsPage(input: {
  window: DueWindowKey;
  settings: LifecycleSettings;
  now?: Date;
  take?: number;
  cursorId?: string | null;
}): Promise<ClaimedLead[]> {
  const now = input.now ?? new Date();
  const take = input.take ?? getRoutingQueueConfig().pageSize;
  const where = baseDueWhere(now, input.window, input.settings);

  // Prisma cannot easily express "nulls first for lastRoutingAttemptAt then
  // nextRoutingAttemptAt". Fetch a slightly larger candidate set and sort in JS
  // for stable fairness within the page; pagination continues until drained.
  const candidates = await prisma.lead.findMany({
    where: {
      ...where,
      ...(input.cursorId ? { id: { gt: input.cursorId } } : {}),
    },
    select: {
      id: true,
      receivedAt: true,
      lastRoutingAttemptAt: true,
      nextRoutingAttemptAt: true,
      routingAttemptCount: true,
      liveSoldAt: true,
      status: true,
      available: true,
    },
    orderBy: [{ id: "asc" }],
    take: Math.max(take * 3, take),
  });

  const sorted = sortDueLeadsFairly(candidates);
  return sorted.slice(0, take);
}

export async function countDueLeads(
  window: DueWindowKey,
  settings: LifecycleSettings,
  now = new Date(),
): Promise<number> {
  return prisma.lead.count({ where: baseDueWhere(now, window, settings) });
}

export async function claimLeadForRouting(
  leadId: string,
  claimToken: string,
  leaseMs?: number,
  now = new Date(),
): Promise<boolean> {
  const lease = leaseMs ?? getRoutingQueueConfig().claimLeaseMs;
  const result = await prisma.lead.updateMany({
    where: {
      id: leadId,
      OR: [
        { routingClaimExpiresAt: null },
        { routingClaimExpiresAt: { lt: now } },
      ],
    },
    data: {
      routingClaimedAt: now,
      routingClaimedBy: claimToken,
      routingClaimExpiresAt: new Date(now.getTime() + lease),
    },
  });
  return result.count === 1;
}

export async function releaseRoutingClaim(
  leadId: string,
  claimToken?: string,
): Promise<void> {
  await prisma.lead.updateMany({
    where: {
      id: leadId,
      ...(claimToken ? { routingClaimedBy: claimToken } : {}),
    },
    data: {
      routingClaimedAt: null,
      routingClaimedBy: null,
      routingClaimExpiresAt: null,
    },
  });
}

export async function extendRoutingClaim(
  leadId: string,
  claimToken: string,
  leaseMs?: number,
  now = new Date(),
): Promise<void> {
  const lease = leaseMs ?? getRoutingQueueConfig().claimLeaseMs;
  await prisma.lead.updateMany({
    where: { id: leadId, routingClaimedBy: claimToken },
    data: {
      routingClaimExpiresAt: new Date(now.getTime() + lease),
    },
  });
}

/**
 * Claim up to `take` due leads from one window (fairness-sorted).
 */
export async function claimDueLeadsPage(input: {
  window: DueWindowKey;
  settings: LifecycleSettings;
  claimToken: string;
  now?: Date;
  take?: number;
}): Promise<{ claimed: ClaimedLead[]; stats: { neverAttempted: number; retries: number } }> {
  const now = input.now ?? new Date();
  const page = await findDueLeadsPage({
    window: input.window,
    settings: input.settings,
    now,
    take: input.take,
  });

  const claimed: ClaimedLead[] = [];
  let neverAttempted = 0;
  let retries = 0;

  for (const lead of page) {
    const ok = await claimLeadForRouting(lead.id, input.claimToken, undefined, now);
    if (!ok) continue;
    claimed.push(lead);
    if (lead.lastRoutingAttemptAt == null && lead.routingAttemptCount === 0) {
      neverAttempted++;
    } else {
      retries++;
    }
  }

  return { claimed, stats: { neverAttempted, retries } };
}

export const ROUTING_WINDOWS: DueWindowKey[] = [
  "realtime",
  "mid",
  "partners_only",
];

/**
 * Run async work with bounded concurrency.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i]!);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}
