import { LeadStatus, PrismaClient } from "@prisma/client";
import { evaluateLeadCategories } from "../src/lib/lead-categories/flexible-lead-categories";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

const FINALIZED_STATUSES = new Set<LeadStatus>([
  LeadStatus.delivered,
  LeadStatus.integrity_posted,
  LeadStatus.aged_listed,
  LeadStatus.dead,
]);

function summarizeOutcome(outcome: ReturnType<typeof evaluateLeadCategories>) {
  if (outcome.outcome === "one") return "matched" as const;
  if (outcome.outcome === "zero") return "no_match" as const;
  return "multiple_matches" as const;
}

async function main() {
  const categories = await prisma.leadCategory.findMany({
    where: { enabled: true },
    select: {
      type: true,
      label: true,
      enabled: true,
      criteria: { select: { field: true, value: true } },
    },
  });

  const leads = await prisma.lead.findMany({
    select: {
      id: true,
      status: true,
      available: true,
      leadType: true,
      categoryResolution: true,
      categoryCandidateTypes: true,
      rawPayload: true,
    },
  });

  const counts = {
    matched: 0,
    no_match: 0,
    multiple_matches: 0,
    skipped: 0,
    invalid_payload: 0,
    updated: 0,
  };

  for (const lead of leads) {
    if (FINALIZED_STATUSES.has(lead.status)) {
      counts.skipped++;
      continue;
    }

    if (
      !lead.rawPayload ||
      typeof lead.rawPayload !== "object" ||
      Array.isArray(lead.rawPayload)
    ) {
      counts.invalid_payload++;
      continue;
    }

    const outcome = evaluateLeadCategories(
      lead.rawPayload as Record<string, unknown>,
      categories,
    );
    const categoryResolution = summarizeOutcome(outcome);

    if (categoryResolution === "matched") counts.matched++;
    else if (categoryResolution === "no_match") counts.no_match++;
    else counts.multiple_matches++;

    const nextData = {
      leadType: outcome.categoryType,
      categoryResolution,
      categoryCandidateTypes: outcome.matchedTypes,
      status:
        outcome.status === "review" ? LeadStatus.review : LeadStatus.unmatched,
      available: outcome.available && outcome.status !== "review",
    };

    const changed =
      lead.leadType !== nextData.leadType ||
      lead.categoryResolution !== nextData.categoryResolution ||
      JSON.stringify(lead.categoryCandidateTypes) !==
        JSON.stringify(nextData.categoryCandidateTypes) ||
      lead.status !== nextData.status ||
      lead.available !== nextData.available;

    if (changed && apply) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: nextData,
      });
      counts.updated++;
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        total: leads.length,
        ...counts,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
