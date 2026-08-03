import { LeadStatus, PartnerStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getEffectivePrice,
  isFilterSetEligibleForLead,
  isWithinLimits,
} from "@/lib/matching/eligibility";
import { getDefaultRealtimePrice } from "@/lib/settings/app-settings";
import { holdLeadsForReprocess } from "@/lib/jobs/reprocess-hold";

export type EligibleReprocessPartner = {
  id: string;
  firstName: string;
  lastName: string;
  priority: number;
  matchCount: number;
};

export class ReprocessEligibilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReprocessEligibilityError";
  }
}

export async function getEligiblePartnersForReprocess(
  leadIds: string[],
): Promise<EligibleReprocessPartner[]> {
  if (leadIds.length === 0) {
    throw new ReprocessEligibilityError("leadIds must be a non-empty array");
  }

  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds } },
  });

  if (leads.length !== leadIds.length) {
    throw new ReprocessEligibilityError("One or more leads not found");
  }

  const invalid = leads.filter(
    (lead) => !lead.available || lead.status !== LeadStatus.unmatched,
  );
  if (invalid.length > 0) {
    throw new ReprocessEligibilityError(
      `${invalid.length} lead(s) are not available for reprocessing`,
    );
  }

  holdLeadsForReprocess(leadIds);

  const defaultPrice = await getDefaultRealtimePrice();

  const partners = await prisma.partner.findMany({
    where: { status: PartnerStatus.active },
    include: {
      filterSets: {
        where: { active: true, isTemplate: false },
      },
    },
  });

  const eligible: EligibleReprocessPartner[] = [];

  for (const partner of partners) {
    let matchCount = 0;

    for (const lead of leads) {
      let leadEligible = false;

      for (const filterSet of partner.filterSets) {
        const effectivePrice = getEffectivePrice(filterSet, defaultPrice);
        if (
          !isFilterSetEligibleForLead(
            filterSet,
            partner,
            lead.state,
            lead.leadType ?? "",
            effectivePrice,
            lead,
          )
        ) {
          continue;
        }
        if (!(await isWithinLimits(filterSet))) continue;
        leadEligible = true;
        break;
      }

      if (leadEligible) matchCount++;
    }

    if (matchCount > 0) {
      eligible.push({
        id: partner.id,
        firstName: partner.firstName,
        lastName: partner.lastName,
        priority: partner.priority,
        matchCount,
      });
    }
  }

  eligible.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.lastName.localeCompare(b.lastName);
  });

  return eligible;
}
