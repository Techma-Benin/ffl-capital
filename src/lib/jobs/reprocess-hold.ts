import { prisma } from "@/lib/db";

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const HOLD_CLAIM_BY = "manual-reprocess-hold";

/**
 * Cross-instance reprocess hold via the lead routing claim lease.
 * Replaces the previous process-local Map so holds work across Replit instances.
 */
export async function holdLeadsForReprocess(
  leadIds: string[],
  ttlMs = DEFAULT_TTL_MS,
): Promise<void> {
  if (leadIds.length === 0) return;
  const now = new Date();
  await prisma.lead.updateMany({
    where: { id: { in: leadIds } },
    data: {
      routingClaimedAt: now,
      routingClaimedBy: HOLD_CLAIM_BY,
      routingClaimExpiresAt: new Date(now.getTime() + ttlMs),
    },
  });
}

export async function releaseLeadsFromReprocessHold(
  leadIds: string[],
): Promise<void> {
  if (leadIds.length === 0) return;
  await prisma.lead.updateMany({
    where: {
      id: { in: leadIds },
      routingClaimedBy: HOLD_CLAIM_BY,
    },
    data: {
      routingClaimedAt: null,
      routingClaimedBy: null,
      routingClaimExpiresAt: null,
    },
  });
}

export async function isLeadHeldForReprocess(leadId: string): Promise<boolean> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      routingClaimedBy: true,
      routingClaimExpiresAt: true,
    },
  });
  if (!lead?.routingClaimExpiresAt) return false;
  if (lead.routingClaimExpiresAt.getTime() <= Date.now()) {
    if (lead.routingClaimedBy === HOLD_CLAIM_BY) {
      await prisma.lead.updateMany({
        where: { id: leadId, routingClaimedBy: HOLD_CLAIM_BY },
        data: {
          routingClaimedAt: null,
          routingClaimedBy: null,
          routingClaimExpiresAt: null,
        },
      });
    }
    return false;
  }
  // Only the manual reprocess hold blocks automatic routing —
  // cron claims are ownership of the current worker, not a hold.
  return lead.routingClaimedBy === HOLD_CLAIM_BY;
}

export function isManualReprocessHoldClaim(claimBy: string | null | undefined): boolean {
  return claimBy === HOLD_CLAIM_BY;
}
