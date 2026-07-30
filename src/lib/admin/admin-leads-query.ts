import { LeadCategoryResolution, LeadStatus, Prisma } from "@prisma/client";
import { buildAgedLeadWhere } from "@/lib/aged/eligibility";
import { resolveAdminReceivedAtRange } from "@/lib/admin/admin-date-period";
import {
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
  }

  if (f.states?.length) where.state = { in: f.states };

  if (f.categoryResolution) {
    where.categoryResolution =
      f.categoryResolution === "no_match"
        ? LeadCategoryResolution.no_match
        : LeadCategoryResolution.multiple_matches;
  }
  if (f.categoryCandidateTypes?.length) {
    where.categoryCandidateTypes = { hasSome: f.categoryCandidateTypes };
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
  ] as const;
  return allowed.includes(status as (typeof allowed)[number])
    ? (status as AdminLeadViewFilters["statusSlice"])
    : undefined;
}
