import { LeadCategoryResolution, LeadStatus, Prisma } from "@prisma/client";
import { buildAgedLeadWhere } from "@/lib/aged/eligibility";
import { resolveAdminReceivedAtRange } from "@/lib/admin/admin-date-period";
import {
  MULTIPLE_CATEGORY_MATCH_TYPE_FILTER,
  UNCLASSIFIED_TYPE_FILTER,
  parseAdminFilters,
  type AdminLeadViewFilters,
} from "@/lib/leads/list-view-schema";

function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function buildSearchWhere(q: string): Prisma.LeadWhereInput {
  const phoneDigits = normalizePhoneDigits(q);
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);

  const orConditions: Prisma.LeadWhereInput[] = [
    ...(isUuid ? [{ id: q }] : []),
    { externalId: q },
    { email: { contains: q, mode: "insensitive" } },
  ];

  if (phoneDigits.length >= 7) {
    orConditions.push({ phone: { contains: phoneDigits } });
  }

  return { OR: orConditions };
}

export async function buildAdminLeadsWhere(
  filters: AdminLeadViewFilters | unknown,
): Promise<Prisma.LeadWhereInput> {
  const f = parseAdminFilters(filters);

  if (f.q?.trim()) {
    return buildSearchWhere(f.q.trim());
  }

  let where: Prisma.LeadWhereInput = {};
  const slice = f.statusSlice ?? "all";

  if (slice === "matched") {
    where.status = LeadStatus.delivered;
  } else if (slice === "unmatched") {
    where.status = LeadStatus.unmatched;
  } else if (slice === "integrity_posted") {
    where.status = LeadStatus.integrity_posted;
  } else if (slice === "aged_listed") {
    where = await buildAgedLeadWhere();
  } else if (slice === "review") {
    where.status = LeadStatus.review;
  }

  if (f.states?.length) where.state = { in: f.states };

  if (f.types?.length) {
    const normalTypes = f.types.filter(
      (type) =>
        type !== UNCLASSIFIED_TYPE_FILTER &&
        type !== MULTIPLE_CATEGORY_MATCH_TYPE_FILTER,
    );
    const typeConditions: Prisma.LeadWhereInput[] = [];
    if (normalTypes.length) {
      typeConditions.push(
        {
          categoryResolution: LeadCategoryResolution.matched,
          leadType: { in: normalTypes },
        },
        {
          categoryResolution: LeadCategoryResolution.multiple_matches,
          categoryCandidateTypes: { hasSome: normalTypes },
        },
      );
    }
    if (f.types.includes(UNCLASSIFIED_TYPE_FILTER)) {
      typeConditions.push({
        categoryResolution: LeadCategoryResolution.no_match,
      });
    }
    if (f.types.includes(MULTIPLE_CATEGORY_MATCH_TYPE_FILTER)) {
      typeConditions.push({
        categoryResolution: LeadCategoryResolution.multiple_matches,
      });
    }
    if (typeConditions.length) {
      const existingAnd = where.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : [];
      where.AND = [...existingAnd, { OR: typeConditions }];
    }
  }

  if (f.filterSetId) {
    where.leadDeliveries = { some: { filterSetId: f.filterSetId } };
  }

  const receivedRange = resolveAdminReceivedAtRange(f);
  if (receivedRange) {
    where.receivedAt = {};
    if (receivedRange.gte) where.receivedAt.gte = receivedRange.gte;
    if (receivedRange.lte) where.receivedAt.lte = receivedRange.lte;
  }

  return where;
}

/** Legacy status tab param → statusSlice for redirect shim */
export function legacyStatusToSlice(
  status: string | undefined,
): AdminLeadViewFilters["statusSlice"] | undefined {
  if (!status || status === "all") return undefined;
  const allowed = [
    "matched",
    "unmatched",
    "integrity_posted",
    "aged_listed",
    "review",
  ] as const;
  return allowed.includes(status as (typeof allowed)[number])
    ? (status as AdminLeadViewFilters["statusSlice"])
    : undefined;
}
