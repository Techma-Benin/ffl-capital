import type { Prisma } from "@prisma/client";
import { hasEligibleFilterSet } from "@/lib/partner/default-filter-set";

export const PARTNER_SORT_KEYS = [
  "partner",
  "affiliation",
  "status",
  "priority",
  "wallet",
  "leadBuying",
  "leads",
] as const;

export type PartnerSortKey = (typeof PARTNER_SORT_KEYS)[number];

export type SortDirection = "asc" | "desc";

export function parsePartnerSort(searchParams: {
  sort?: string;
  dir?: string;
}): { sort?: PartnerSortKey; dir: SortDirection } {
  const sort = PARTNER_SORT_KEYS.includes(searchParams.sort as PartnerSortKey)
    ? (searchParams.sort as PartnerSortKey)
    : undefined;
  const dir: SortDirection = searchParams.dir === "desc" ? "desc" : "asc";
  return { sort, dir };
}

export function buildPartnerSortHref(
  basePath: string,
  searchParams: Record<string, string | undefined>,
  sortKey: PartnerSortKey,
): string {
  const currentSort = searchParams.sort;
  const currentDir = searchParams.dir === "desc" ? "desc" : "asc";
  const dir: SortDirection =
    currentSort === sortKey ? (currentDir === "asc" ? "desc" : "asc") : "asc";

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v && k !== "page") params.set(k, v);
  }
  params.set("sort", sortKey);
  params.set("dir", dir);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function buildPartnerOrderBy(
  sort: PartnerSortKey | undefined,
  dir: SortDirection,
): Prisma.PartnerOrderByWithRelationInput[] {
  if (!sort) {
    return [{ status: "asc" }, { createdAt: "desc" }];
  }

  switch (sort) {
    case "partner":
      return [{ firstName: dir }, { lastName: dir }];
    case "affiliation":
      return [{ affiliation: dir }];
    case "status":
      return [{ status: dir }];
    case "priority":
      return [{ priority: dir }];
    case "wallet":
      return [{ walletBalance: dir }];
    case "leads":
      return [{ leadDeliveries: { _count: dir } }];
    case "leadBuying":
      return [{ status: "asc" }, { createdAt: "desc" }];
    default:
      return [{ status: "asc" }, { createdAt: "desc" }];
  }
}

type PartnerForLeadBuyingCompute = {
  status: string;
  walletBalance: { toNumber?: () => number } | number | string;
  filterSets: Array<{ active: boolean; filterStates: string[] }>;
};

type PartnerForLeadBuyingSort = PartnerForLeadBuyingCompute & {
  firstName: string;
  lastName: string;
};

export function computeLeadBuying(partner: PartnerForLeadBuyingCompute): boolean {
  const isActive = partner.status === "active";
  const balance =
    typeof partner.walletBalance === "object" &&
    partner.walletBalance !== null &&
    "toNumber" in partner.walletBalance &&
    typeof partner.walletBalance.toNumber === "function"
      ? partner.walletBalance.toNumber()
      : Number(partner.walletBalance);
  const walletOk = balance >= 25;
  const statesOk = hasEligibleFilterSet(partner.filterSets);
  return isActive && walletOk && statesOk;
}

export function countPartnersLeadBuying(
  partners: PartnerForLeadBuyingCompute[],
): number {
  return partners.reduce((n, p) => n + (computeLeadBuying(p) ? 1 : 0), 0);
}

export function sortPartnersByLeadBuying<T extends PartnerForLeadBuyingSort>(
  partners: T[],
  dir: SortDirection,
): T[] {
  const copy = [...partners];
  copy.sort((a, b) => {
    const aVal = computeLeadBuying(a) ? 1 : 0;
    const bVal = computeLeadBuying(b) ? 1 : 0;
    if (aVal !== bVal) {
      return dir === "asc" ? aVal - bVal : bVal - aVal;
    }
    const nameA = `${a.firstName} ${a.lastName}`;
    const nameB = `${b.firstName} ${b.lastName}`;
    return nameA.localeCompare(nameB);
  });
  return copy;
}
