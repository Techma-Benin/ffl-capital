import type { Prisma } from "@prisma/client";
import type { LeadViewSort } from "@/lib/leads/list-view-schema";

export const PARTNER_LEAD_SORT_KEYS = [
  "name",
  "state",
  "type",
  "channel",
  "price",
  "status",
  "deliveredAt",
] as const;

export type PartnerLeadSortKey = (typeof PARTNER_LEAD_SORT_KEYS)[number];

export type SortDirection = "asc" | "desc";

export function parsePartnerLeadSort(
  sort: LeadViewSort | undefined,
  urlOverrides?: { sort?: string; dir?: string },
): { field: PartnerLeadSortKey; direction: SortDirection } {
  if (
    urlOverrides?.sort &&
    PARTNER_LEAD_SORT_KEYS.includes(urlOverrides.sort as PartnerLeadSortKey)
  ) {
    return {
      field: urlOverrides.sort as PartnerLeadSortKey,
      direction: urlOverrides.dir === "asc" ? "asc" : "desc",
    };
  }
  const field = PARTNER_LEAD_SORT_KEYS.includes(sort?.field as PartnerLeadSortKey)
    ? (sort!.field as PartnerLeadSortKey)
    : "deliveredAt";
  const direction: SortDirection =
    sort?.direction === "asc" ? "asc" : "desc";
  return { field, direction };
}

export function buildPartnerLeadSortHref(
  basePath: string,
  searchParams: Record<string, string | undefined>,
  sortKey: PartnerLeadSortKey,
  current: { field: PartnerLeadSortKey; direction: SortDirection },
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

export function buildPartnerLeadOrderBy(
  sort: LeadViewSort | undefined,
  urlOverrides?: { sort?: string; dir?: string },
): Prisma.LeadDeliveryOrderByWithRelationInput | Prisma.LeadDeliveryOrderByWithRelationInput[] {
  const { field, direction } = parsePartnerLeadSort(sort, urlOverrides);

  switch (field) {
    case "name":
      return [{ lead: { lastName: direction } }, { lead: { firstName: direction } }];
    case "state":
      return { lead: { state: direction } };
    case "type":
      return { lead: { leadType: direction } };
    case "channel":
      return { channel: direction };
    case "price":
      return { price: direction };
    case "status":
      return { refundedAt: direction };
    case "deliveredAt":
    default:
      return { deliveredAt: direction };
  }
}
