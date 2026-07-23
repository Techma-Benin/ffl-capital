import {
  PartnerFilterSet,
  PartnerStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  DEFAULT_FILTER_SET_NAME,
  MIN_FILTER_STATES,
} from "./constants";

export { DEFAULT_FILTER_SET_NAME, MIN_FILTER_STATES } from "./constants";

type DbClient = Prisma.TransactionClient | typeof prisma;

/** Prefer the named Default set; otherwise the oldest filter set. */
export function pickDefaultFilterSet(
  filterSets: PartnerFilterSet[],
): PartnerFilterSet | null {
  if (filterSets.length === 0) return null;
  return (
    filterSets.find((fs) => fs.name === DEFAULT_FILTER_SET_NAME) ??
    filterSets[0] ??
    null
  );
}

/** True when any active filter set meets the min-states bar used by matching. */
export function hasEligibleFilterSet(
  filterSets: Array<Pick<PartnerFilterSet, "active" | "filterStates">>,
): boolean {
  return filterSets.some(
    (fs) => fs.active && fs.filterStates.length >= MIN_FILTER_STATES,
  );
}

export async function listPartnerFilterSets(
  partnerId: string,
  client: DbClient = prisma,
): Promise<PartnerFilterSet[]> {
  return client.partnerFilterSet.findMany({
    where: { partnerId },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Keep the partner's default PartnerFilterSet in sync with partner-level
 * filterStates. Matching uses filter sets, not Partner.filterStates alone.
 */
export async function syncDefaultFilterSetStates(params: {
  partnerId: string;
  filterStates: string[];
  partnerStatus: PartnerStatus;
  client?: DbClient;
}): Promise<PartnerFilterSet> {
  const client = params.client ?? prisma;
  const existing = pickDefaultFilterSet(
    await listPartnerFilterSets(params.partnerId, client),
  );

  if (existing) {
    return client.partnerFilterSet.update({
      where: { id: existing.id },
      data: {
        filterStates: params.filterStates,
        // Keep set buyability in sync with partner approval status
        active: params.partnerStatus === PartnerStatus.active,
      },
    });
  }

  return client.partnerFilterSet.create({
    data: {
      partnerId: params.partnerId,
      name: DEFAULT_FILTER_SET_NAME,
      leadType: "traditional_iul",
      filterStates: params.filterStates,
      active: params.partnerStatus === PartnerStatus.active,
    },
  });
}

/**
 * When a partner is approved/disabled, mirror that onto their filter sets.
 * Matching only considers active filter sets — leaving them inactive after
 * admin approval leaves the partner "Inactive" despite wallet + states.
 */
export async function syncFilterSetsActiveWithPartnerStatus(
  partnerId: string,
  status: PartnerStatus,
  client: DbClient = prisma,
): Promise<void> {
  if (status === PartnerStatus.active) {
    // Only activate sets that meet the matching min-states bar. Sets below the
    // threshold (or ones an admin deliberately deactivated) stay inactive.
    const eligible = await client.partnerFilterSet.findMany({
      where: { partnerId },
      select: { id: true, filterStates: true },
    });
    const eligibleIds = eligible
      .filter((fs) => fs.filterStates.length >= MIN_FILTER_STATES)
      .map((fs) => fs.id);

    if (eligibleIds.length > 0) {
      await client.partnerFilterSet.updateMany({
        where: { id: { in: eligibleIds } },
        data: { active: true },
      });
    }
    return;
  }

  // Any non-active partner status deactivates all filter sets.
  await client.partnerFilterSet.updateMany({
    where: { partnerId },
    data: { active: false },
  });
}
