import type { Prisma } from "@prisma/client";

export const ADMIN_AGED_LEAD_SORT_KEYS = [
  "name",
  "state",
  "type",
  "status",
  "ageDays",
  "price",
] as const;

export type AdminAgedLeadSortKey = (typeof ADMIN_AGED_LEAD_SORT_KEYS)[number];

export type SortDirection = "asc" | "desc";

const DEFAULT_SORT: AdminAgedLeadSortKey = "ageDays";
const DEFAULT_DIR: SortDirection = "desc";

export function parseAdminAgedLeadSort(searchParams: {
  sort?: string;
  dir?: string;
}): { sort: AdminAgedLeadSortKey; dir: SortDirection } {
  const hasSortParam = Boolean(searchParams.sort);
  const sort = ADMIN_AGED_LEAD_SORT_KEYS.includes(
    searchParams.sort as AdminAgedLeadSortKey,
  )
    ? (searchParams.sort as AdminAgedLeadSortKey)
    : DEFAULT_SORT;

  let dir: SortDirection;
  if (searchParams.dir === "asc" || searchParams.dir === "desc") {
    dir = searchParams.dir;
  } else if (!hasSortParam) {
    dir = DEFAULT_DIR;
  } else {
    dir = "asc";
  }
  return { sort, dir };
}

export function buildAdminAgedLeadSortHref(
  basePath: string,
  searchParams: Record<string, string | undefined>,
  sortKey: AdminAgedLeadSortKey,
): string {
  const { sort: currentSort, dir: currentDir } = parseAdminAgedLeadSort(searchParams);
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

export function buildAdminAgedLeadOrderBy(
  sort: AdminAgedLeadSortKey,
  dir: SortDirection,
): Prisma.LeadOrderByWithRelationInput | Prisma.LeadOrderByWithRelationInput[] {
  switch (sort) {
    case "name":
      return [{ lastName: dir }, { firstName: dir }];
    case "state":
      return { state: dir };
    case "type":
      return { leadType: dir };
    case "status":
      return { status: dir };
    case "ageDays":
      return { receivedAt: dir === "asc" ? "desc" : "asc" };
    case "price":
      return { id: dir };
    default:
      return { receivedAt: dir === "asc" ? "desc" : "asc" };
  }
}

export function sortHrefMap(
  basePath: string,
  searchParams: Record<string, string | undefined>,
): Record<AdminAgedLeadSortKey, string> {
  return Object.fromEntries(
    ADMIN_AGED_LEAD_SORT_KEYS.map((key) => [
      key,
      buildAdminAgedLeadSortHref(basePath, searchParams, key),
    ]),
  ) as Record<AdminAgedLeadSortKey, string>;
}
