import type { Prisma } from "@prisma/client";
import type { LeadViewSort } from "@/lib/leads/list-view-schema";
import {
  formatAdminLeadPartnerLabel,
  resolveIntegrityLiveSaleChannel,
} from "@/lib/leads/lead-status-label";

export const ADMIN_LEAD_SORT_KEYS = [
  "id",
  "name",
  "phone",
  "state",
  "leadType",
  "status",
  "partner",
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

/**
 * First word of the Partner-column display label (case-insensitive).
 * Empty / "—" partners sort as "".
 */
export function adminLeadPartnerSortKey(input: {
  status: string;
  liveSaleChannel?: string | null;
  resaleMode?: string | null;
  partnerFirstName?: string | null;
  partnerLastName?: string | null;
}): string {
  const channel = resolveIntegrityLiveSaleChannel(
    input.liveSaleChannel,
    input.resaleMode,
  );
  const partnerName =
    input.partnerFirstName != null && input.partnerFirstName !== ""
      ? `${input.partnerFirstName} ${input.partnerLastName ?? ""}`.trim()
      : null;
  const label = formatAdminLeadPartnerLabel(
    input.status,
    channel,
    partnerName,
  );
  if (!label) return "";
  const firstWord = label.trim().split(/\s+/)[0] ?? "";
  return firstWord.toLocaleLowerCase();
}

export type AdminLeadPartnerSortRow = {
  id: string;
  status: string;
  liveSaleChannel?: string | null;
  leadDeliveries: Array<{
    partner: { firstName: string; lastName: string };
  }>;
  resalePostings: Array<{ mode: string | null }>;
};

/** Page of lead IDs ordered by Partner-column first word. */
export function pageAdminLeadIdsByPartnerSort(
  rows: AdminLeadPartnerSortRow[],
  direction: SortDirection,
  skip: number,
  take: number,
): string[] {
  const sorted = [...rows].sort((a, b) => {
    const deliveryA = a.leadDeliveries[0];
    const deliveryB = b.leadDeliveries[0];
    const keyA = adminLeadPartnerSortKey({
      status: a.status,
      liveSaleChannel: a.liveSaleChannel,
      resaleMode: a.resalePostings[0]?.mode,
      partnerFirstName: deliveryA?.partner.firstName,
      partnerLastName: deliveryA?.partner.lastName,
    });
    const keyB = adminLeadPartnerSortKey({
      status: b.status,
      liveSaleChannel: b.liveSaleChannel,
      resaleMode: b.resalePostings[0]?.mode,
      partnerFirstName: deliveryB?.partner.firstName,
      partnerLastName: deliveryB?.partner.lastName,
    });
    const cmp = keyA.localeCompare(keyB);
    if (cmp !== 0) return direction === "asc" ? cmp : -cmp;
    return a.id.localeCompare(b.id);
  });
  return sorted.slice(skip, skip + take).map((r) => r.id);
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
    case "partner":
      // Display first-word sort is applied in-memory on the admin list page.
      return { receivedAt: direction };
    case "receivedAt":
    default:
      return { receivedAt: direction };
  }
}
