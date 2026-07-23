import { prisma } from "@/lib/db";
import { getClerkPartnerImageUrlMap } from "@/lib/auth/clerk-profile";
import { parsePartnerCompanies } from "@/lib/admin/partner-list-filters";
import {
  computeLeadBuying,
  parsePartnerSort,
  type PartnerSortKey,
  type SortDirection,
} from "@/lib/admin/partner-list-sort";
import { DEFAULT_PAGE_SIZE, parsePageParams } from "@/lib/pagination";
import type { AdminPartnerRow } from "@/components/admin/admin-partners-table";

const TABLE_AVATAR_DISPLAY_PX = 40;

/** Soft cap — partners are a bounded admin set; skip full client load above this. */
export const ADMIN_PARTNERS_CLIENT_LOAD_LIMIT = 2000;

export type AdminPartnersRawRow = AdminPartnerRow;

export type AdminPartnersRawData = {
  partners: AdminPartnersRawRow[];
  affiliationOptions: string[];
  loadCapped: boolean;
  totalInDb: number;
};

export type AdminPartnersListFilters = {
  status?: string;
  companies: string[];
  sort?: PartnerSortKey;
  dir: SortDirection;
  page: number;
  pageSize: number;
};

export type AdminPartnersViewModel = {
  rows: AdminPartnersRawRow[];
  totalFiltered: number;
  page: number;
  pageSize: number;
  leadBuyingCount: number;
  pendingCount: number;
  activeCount: number;
  blockedCount: number;
  tabCounts: {
    all: number;
    pending_approval: number;
    active: number;
    disabled: number;
  };
};

export async function fetchAdminPartnersRawData(): Promise<AdminPartnersRawData> {
  const [totalInDb, affiliationGroups, partners] = await Promise.all([
    prisma.partner.count(),
    prisma.partner.groupBy({
      by: ["affiliation"],
      where: { affiliation: { not: null } },
      orderBy: { affiliation: "asc" },
    }),
    prisma.partner.findMany({
      take: ADMIN_PARTNERS_CLIENT_LOAD_LIMIT,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        filterSets: true,
        _count: { select: { leadDeliveries: true } },
      },
    }),
  ]);

  const avatarByClerkId = await getClerkPartnerImageUrlMap(
    partners.map((p) => p.clerkUserId),
    TABLE_AVATAR_DISPLAY_PX,
  );

  const rows: AdminPartnersRawRow[] = partners.map((p) => {
    const leadBuying = computeLeadBuying(p);
    const walletBalance = Number(p.walletBalance);
    return {
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      affiliation: p.affiliation,
      status: p.status,
      priority: p.priority,
      walletBalance,
      leadBuying,
      walletOk: walletBalance >= 25,
      leadsCount: p._count.leadDeliveries,
      avatarUrl: p.clerkUserId
        ? (avatarByClerkId.get(p.clerkUserId) ?? null)
        : null,
    };
  });

  return {
    partners: rows,
    affiliationOptions: affiliationGroups
      .map((g) => g.affiliation)
      .filter((a): a is string => a != null),
    loadCapped: totalInDb > ADMIN_PARTNERS_CLIENT_LOAD_LIMIT,
    totalInDb,
  };
}

function matchesCompanies(
  affiliation: string | null,
  companies: string[],
): boolean {
  if (companies.length === 0) return true;
  return affiliation != null && companies.includes(affiliation);
}

function filterByStatusAndCompany(
  partners: AdminPartnersRawRow[],
  status: string | undefined,
  companies: string[],
): AdminPartnersRawRow[] {
  return partners.filter((p) => {
    if (status && p.status !== status) return false;
    return matchesCompanies(p.affiliation, companies);
  });
}

function compareNullableString(
  a: string | null | undefined,
  b: string | null | undefined,
  dir: SortDirection,
): number {
  const av = a ?? "";
  const bv = b ?? "";
  const cmp = av.localeCompare(bv);
  return dir === "asc" ? cmp : -cmp;
}

function sortPartnersClient(
  partners: AdminPartnersRawRow[],
  sort: PartnerSortKey | undefined,
  dir: SortDirection,
): AdminPartnersRawRow[] {
  if (!sort) {
    return [...partners].sort((a, b) => {
      const statusCmp = a.status.localeCompare(b.status);
      if (statusCmp !== 0) return statusCmp;
      return `${a.lastName} ${a.firstName}`.localeCompare(
        `${b.lastName} ${b.firstName}`,
      );
    });
  }

  if (sort === "leadBuying") {
    // sortPartnersByLeadBuying expects filterSets; we already have leadBuying.
    const copy = [...partners];
    copy.sort((a, b) => {
      const aVal = a.leadBuying ? 1 : 0;
      const bVal = b.leadBuying ? 1 : 0;
      if (aVal !== bVal) {
        return dir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return `${a.lastName} ${a.firstName}`.localeCompare(
        `${b.lastName} ${b.firstName}`,
      );
    });
    return copy;
  }

  const copy = [...partners];
  copy.sort((a, b) => {
    switch (sort) {
      case "partner":
        return compareNullableString(
          `${a.lastName} ${a.firstName}`,
          `${b.lastName} ${b.firstName}`,
          dir,
        );
      case "affiliation":
        return compareNullableString(a.affiliation, b.affiliation, dir);
      case "status":
        return compareNullableString(a.status, b.status, dir);
      case "priority": {
        const cmp = a.priority - b.priority;
        return dir === "asc" ? cmp : -cmp;
      }
      case "wallet": {
        const cmp = a.walletBalance - b.walletBalance;
        return dir === "asc" ? cmp : -cmp;
      }
      case "leads": {
        const cmp = a.leadsCount - b.leadsCount;
        return dir === "asc" ? cmp : -cmp;
      }
      default:
        return 0;
    }
  });
  return copy;
}

export function computeAdminPartnersView(
  raw: AdminPartnersRawData,
  filters: AdminPartnersListFilters,
): AdminPartnersViewModel {
  const { companies, status, sort, dir, pageSize } = filters;
  const companyFiltered = filterByStatusAndCompany(
    raw.partners,
    undefined,
    companies,
  );

  const pendingCount = companyFiltered.filter(
    (p) => p.status === "pending_approval",
  ).length;
  const activeCount = companyFiltered.filter((p) => p.status === "active").length;
  const blockedCount = companyFiltered.filter(
    (p) => p.status === "disabled",
  ).length;
  const leadBuyingCount = companyFiltered.filter(
    (p) => p.status === "active" && p.leadBuying,
  ).length;

  const filtered = filterByStatusAndCompany(raw.partners, status, companies);
  const sorted = sortPartnersClient(filtered, sort, dir);
  const totalFiltered = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize) || 1);
  const page = Math.min(Math.max(1, filters.page), totalPages);
  const skip = (page - 1) * pageSize;
  const rows = sorted.slice(skip, skip + pageSize);

  return {
    rows,
    totalFiltered,
    page,
    pageSize,
    leadBuyingCount,
    pendingCount,
    activeCount,
    blockedCount,
    tabCounts: {
      all: companyFiltered.length,
      pending_approval: pendingCount,
      active: activeCount,
      disabled: blockedCount,
    },
  };
}

export function parseAdminPartnersListFilters(searchParams: {
  status?: string;
  company?: string;
  family?: string;
  sort?: string;
  dir?: string;
  page?: string;
  pageSize?: string;
}): AdminPartnersListFilters {
  const { sort, dir } = parsePartnerSort(searchParams);
  const { page, pageSize } = parsePageParams(searchParams, DEFAULT_PAGE_SIZE);
  return {
    status: searchParams.status,
    companies: parsePartnerCompanies(searchParams),
    sort,
    dir,
    page,
    pageSize,
  };
}
