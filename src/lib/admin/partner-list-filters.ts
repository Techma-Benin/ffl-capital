import type { PartnerStatus, Prisma } from "@prisma/client";

/** URL param for multi-select family (affiliation) filter on admin partners list. */
export const PARTNER_FAMILY_PARAM = "family";

export function parsePartnerFamilies(searchParams: {
  family?: string;
}): string[] {
  const raw = searchParams.family?.trim();
  if (!raw) return [];
  return [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
}

export function buildPartnerListWhere(
  statusFilter: string | undefined,
  families: string[],
): Prisma.PartnerWhereInput {
  const where: Prisma.PartnerWhereInput = {};
  if (statusFilter) {
    where.status = statusFilter as PartnerStatus;
  }
  if (families.length > 0) {
    where.affiliation = { in: families };
  }
  return where;
}

/** Preserves sort, dir, and family when switching status tabs. */
export function buildPartnerStatusTabHref(
  basePath: string,
  searchParams: Record<string, string | undefined>,
  status?: string,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v && k !== "page" && k !== "status") params.set(k, v);
  }
  if (status) params.set("status", status);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
