import { getRoutingQueueConfig } from "./config";
import type { LifecycleSettings, RoutingScheduleUpdate } from "./types";

function pickBackoffMinutes(
  schedule: readonly number[],
  attemptCount: number,
): number {
  const idx = Math.min(Math.max(attemptCount, 0), schedule.length - 1);
  return schedule[idx] ?? schedule[schedule.length - 1]!;
}

function addMinutes(from: Date, minutes: number): Date {
  return new Date(from.getTime() + minutes * 60 * 1000);
}

function hoursUntil(from: Date, hours: number): Date {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Compute next due time after a routing attempt.
 * Retries must not schedule past the relevant lifecycle cutoff when provided.
 */
export function computeNextRoutingAttempt(input: {
  now: Date;
  receivedAt: Date;
  attemptCountAfter: number;
  kind:
    | "partner_miss"
    | "no_campaign"
    | "operational"
    | "integrity_blocked_wait"
    | "waiting_pending"
    | "immediate"
    | "clear";
  settings: LifecycleSettings;
  /** Absolute cutoff (e.g. end of realtime window); next attempt clamped to this. */
  hardCutoffAt?: Date | null;
}): RoutingScheduleUpdate {
  const config = getRoutingQueueConfig();
  const lastRoutingAttemptAt = input.now;
  const routingAttemptCount = input.attemptCountAfter;

  if (input.kind === "clear") {
    return {
      lastRoutingAttemptAt,
      nextRoutingAttemptAt: null,
      routingAttemptCount,
    };
  }

  if (input.kind === "immediate") {
    return {
      lastRoutingAttemptAt,
      nextRoutingAttemptAt: input.now,
      routingAttemptCount,
    };
  }

  let delayMinutes: number;
  switch (input.kind) {
    case "no_campaign":
      delayMinutes = pickBackoffMinutes(
        config.noCampaignBackoffMinutes,
        Math.max(0, routingAttemptCount - 1),
      );
      break;
    case "operational":
      delayMinutes = pickBackoffMinutes(
        config.operationalBackoffMinutes,
        Math.max(0, routingAttemptCount - 1),
      );
      break;
    case "partner_miss":
      delayMinutes = pickBackoffMinutes(
        config.partnerMissBackoffMinutes,
        Math.max(0, routingAttemptCount - 1),
      );
      break;
    case "integrity_blocked_wait": {
      // Wait until partner-capable window (realtime cutoff from receivedAt).
      const partnerEligibleAt = hoursUntil(
        input.receivedAt,
        input.settings.realtimeCutoffHours,
      );
      return {
        lastRoutingAttemptAt,
        nextRoutingAttemptAt:
          partnerEligibleAt > input.now ? partnerEligibleAt : input.now,
        routingAttemptCount,
      };
    }
    case "waiting_pending":
      delayMinutes = 5;
      break;
    default:
      delayMinutes = 15;
  }

  let next = addMinutes(input.now, delayMinutes);
  if (input.hardCutoffAt && next > input.hardCutoffAt) {
    // Past cutoff: mark due at cutoff so the next window can pick it up,
    // or null if already past.
    next = input.hardCutoffAt;
  }

  return {
    lastRoutingAttemptAt,
    nextRoutingAttemptAt: next,
    routingAttemptCount,
  };
}

export function realtimeWindowEndsAt(
  receivedAt: Date,
  settings: LifecycleSettings,
): Date {
  return hoursUntil(receivedAt, settings.realtimeCutoffHours);
}

export function agedCutoffAt(receivedAt: Date, settings: LifecycleSettings): Date {
  return hoursUntil(receivedAt, settings.agedDaysThreshold * 24);
}
