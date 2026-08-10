import type { Prisma } from "@prisma/client";
import type { LeadViewSort } from "@/lib/leads/list-view-schema";

export const ADMIN_LEAD_SORT_KEYS = [
  "id",
  "name",
  "phone",
  "state",
  "leadType",
  "status",
  "receivedAt",
] as const;

export type AdminLeadSortKey = (typeof ADMIN_LEAD_SORT_KEYS)[number];

export type SortDirection = "asc" | "desc";

export function parseAdminLeadSort(
  sort: LeadViewSort | undefined,
  urlOverrides?: { sort?: string; dir?: string },
): {
  field: AdminLeadSortKey;
  direction: SortDirection;
} {
  if (
    urlOverrides?.sort &&
    ADMIN_LEAD_SORT_KEYS.includes(urlOverrides.sort as AdminLeadSortKey)
  ) {
    return {
      field: urlOverrides.sort as AdminLeadSortKey,
      direction: urlOverrides.dir === "asc" ? "asc" : "desc",
    };
  }
  const field = ADMIN_LEAD_SORT_KEYS.includes(sort?.field as AdminLeadSortKey)
    ? (sort!.field as AdminLeadSortKey)
    : "receivedAt";
  const direction: SortDirection =
    sort?.direction === "asc" ? "asc" : "desc";
  return { field, direction };
}

export function buildAdminLeadSortHref(
  basePath: string,
  searchParams: Record<string, string | undefined>,
  sortKey: AdminLeadSortKey,
  current: { field: AdminLeadSortKey; direction: SortDirection },
): string {
  const nextDir: SortDirection =
    current.field === sortKey
      ? current.direction === "asc"
        ? "desc"
        : "asc"
      : "asc";

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v && k !== "page") params.set(k, v);
  }
  params.set("sort", sortKey);
  params.set("dir", nextDir);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function buildAdminLeadOrderBy(
  sort: LeadViewSort | undefined,
  urlOverrides?: { sort?: string; dir?: string },
): Prisma.LeadOrderByWithRelationInput | Prisma.LeadOrderByWithRelationInput[] {
  const { field, direction } = parseAdminLeadSort(sort, urlOverrides);

  switch (field) {
    case "name":
      return [{ firstName: direction }, { lastName: direction }];
    case "id":
      return { id: direction };
    case "phone":
      return { phone: direction };
    case "state":
      return { state: direction };
    case "leadType":
      return { leadType: direction };
    case "status":
      return { status: direction };
    case "receivedAt":
    default:
      return { receivedAt: direction };
  }
}
