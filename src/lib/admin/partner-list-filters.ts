import type { PartnerStatus, Prisma } from "@prisma/client";

/** URL param for multi-select company (affiliation) filter on admin partners list. */
export const PARTNER_COMPANY_PARAM = "company";

/** Legacy param — still read for backward-compatible bookmarks. */
const PARTNER_FAMILY_PARAM_LEGACY = "family";

export function parsePartnerCompanies(searchParams: {
  company?: string;
  family?: string;
}): string[] {
  const raw = (searchParams.company ?? searchParams.family)?.trim();
  if (!raw) return [];
  return Array.from(
    new Set(raw.split(",").map((s) => s.trim()).filter(Boolean)),
  );
}

/** @deprecated use parsePartnerCompanies */
export const parsePartnerFamilies = parsePartnerCompanies;

/** @deprecated use PARTNER_COMPANY_PARAM */
export const PARTNER_FAMILY_PARAM = PARTNER_COMPANY_PARAM;

export function buildPartnerListWhere(
  statusFilter: string | undefined,
  companies: string[],
): Prisma.PartnerWhereInput {
  const where: Prisma.PartnerWhereInput = {};
  if (statusFilter) {
    where.status = statusFilter as PartnerStatus;
  }
  if (companies.length > 0) {
    where.affiliation = { in: companies };
  }
  return where;
}

/** Preserves sort, dir, and company filter when switching status tabs. */
export function buildPartnerStatusTabHref(
  basePath: string,
  searchParams: Record<string, string | undefined>,
  status?: string,
): string {
  const params = new URLSearchParams();
  const companies = parsePartnerCompanies(searchParams);
  for (const [k, v] of Object.entries(searchParams)) {
    if (
      v &&
      k !== "page" &&
      k !== "status" &&
      k !== PARTNER_COMPANY_PARAM &&
      k !== PARTNER_FAMILY_PARAM_LEGACY
    ) {
      params.set(k, v);
    }
  }
  if (companies.length > 0) {
    params.set(PARTNER_COMPANY_PARAM, companies.join(","));
  }
  if (status) params.set("status", status);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
