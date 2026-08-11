import {
  LeadCategoryResolution,
  LeadEventType,
  LeadStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { emitLeadEvent } from "@/lib/leads/lead-events";
import {
  evaluateLeadCategories,
  type CategoryEvaluationOutcome,
} from "@/lib/lead-categories/flexible-lead-categories";

export const CATEGORY_RECLASSIFICATION_FINAL_STATUSES = [
  LeadStatus.delivered,
  LeadStatus.integrity_posted,
  LeadStatus.dead,
] as const;

export type CategoryClassificationUpdate = {
  leadType: string | null;
  categoryResolution: LeadCategoryResolution;
  categoryCandidateTypes: string[];
  status: LeadStatus;
  available: boolean;
};

export function categoryOutcomeToLeadUpdate(
  outcome: CategoryEvaluationOutcome,
): CategoryClassificationUpdate {
  return {
    leadType: outcome.categoryType,
    categoryResolution:
      outcome.outcome === "one"
        ? LeadCategoryResolution.matched
        : outcome.outcome === "zero"
          ? LeadCategoryResolution.no_match
          : LeadCategoryResolution.multiple_matches,
    categoryCandidateTypes: outcome.matchedTypes,
    status:
      outcome.outcome === "one" ? LeadStatus.unmatched : LeadStatus.review,
    available: outcome.outcome === "one",
  };
}

export function isFinalizedCategoryStatus(status: LeadStatus): boolean {
  return CATEGORY_RECLASSIFICATION_FINAL_STATUSES.includes(
    status as (typeof CATEGORY_RECLASSIFICATION_FINAL_STATUSES)[number],
  );
}

function isRecord(value: Prisma.JsonValue | null): value is Prisma.JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function classificationChanged(
  lead: {
    leadType: string | null;
    categoryResolution: LeadCategoryResolution;
    categoryCandidateTypes: string[];
  },
  next: CategoryClassificationUpdate,
): boolean {
  return (
    lead.leadType !== next.leadType ||
    lead.categoryResolution !== next.categoryResolution ||
    lead.categoryCandidateTypes.length !== next.categoryCandidateTypes.length ||
    lead.categoryCandidateTypes.some(
      (type, index) => type !== next.categoryCandidateTypes[index],
    )
  );
}

export async function reclassifyNonFinalizedLeads(options?: {
  batchSize?: number;
}): Promise<{ scanned: number; changed: number; batches: number }> {
  const batchSize = options?.batchSize ?? 100;
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error("Category reclassification batch size must be positive");
  }

  const categories = await prisma.leadCategory.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      type: true,
      label: true,
      enabled: true,
      criteria: { select: { field: true, value: true } },
    },
  });

  let cursor: string | undefined;
  let scanned = 0;
  let changed = 0;
  let batches = 0;

  for (;;) {
    const leads = await prisma.lead.findMany({
      where: {
        status: { notIn: [...CATEGORY_RECLASSIFICATION_FINAL_STATUSES] },
      },
      orderBy: { id: "asc" },
      take: batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        rawPayload: true,
        leadType: true,
        categoryResolution: true,
        categoryCandidateTypes: true,
      },
    });
    if (!leads.length) break;

    scanned += leads.length;
    batches++;
    const changes = leads.flatMap((lead) => {
      const outcome = evaluateLeadCategories(
        isRecord(lead.rawPayload)
          ? (lead.rawPayload as Record<string, unknown>)
          : {},
        categories,
      );
      const next = categoryOutcomeToLeadUpdate(outcome);
      return classificationChanged(lead, next) ? [{ lead, next }] : [];
    });

    if (changes.length) {
      const batchChanged = await prisma.$transaction(
        async (tx) => {
          let updatedCount = 0;
          for (const { lead, next } of changes) {
            const updated = await tx.lead.updateMany({
              where: {
                id: lead.id,
                status: {
                  notIn: [...CATEGORY_RECLASSIFICATION_FINAL_STATUSES],
                },
              },
              data: next,
            });
            if (updated.count === 0) continue;
            updatedCount++;
            await emitLeadEvent(
              lead.id,
              LeadEventType.reprocessed,
              {
                reason: "category_rules_changed",
                previous: {
                  leadType: lead.leadType,
                  categoryResolution: lead.categoryResolution,
                  categoryCandidateTypes: lead.categoryCandidateTypes,
                },
                next: {
                  leadType: next.leadType,
                  categoryResolution: next.categoryResolution,
                  categoryCandidateTypes: next.categoryCandidateTypes,
                },
              },
              undefined,
              tx,
            );
          }
          return updatedCount;
        },
        { timeout: 30_000 },
      );
      changed += batchChanged;
    }

    cursor = leads.at(-1)!.id;
  }

  return { scanned, changed, batches };
}
