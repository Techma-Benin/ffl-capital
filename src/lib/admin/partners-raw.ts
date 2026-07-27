import { prisma } from "@/lib/db";
import { computeLeadBuying } from "@/lib/admin/partner-list-sort";
import type {
  AdminPartnersRawData,
  AdminPartnersRawRow,
} from "@/lib/admin/partners-view";

/** Soft cap — partners are a bounded admin set; skip full client load above this. */
export const ADMIN_PARTNERS_CLIENT_LOAD_LIMIT = 2000;

export type { AdminPartnersRawData, AdminPartnersRawRow } from "@/lib/admin/partners-view";
export {
  computeAdminPartnersView,
  parseAdminPartnersListFilters,
  type AdminPartnersListFilters,
  type AdminPartnersViewModel,
} from "@/lib/admin/partners-view";

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
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        affiliation: true,
        status: true,
        priority: true,
        walletBalance: true,
        avatarUrl: true,
        filterSets: {
          where: { isTemplate: false },
          select: { active: true, filterStates: true },
        },
        _count: { select: { leadDeliveries: true } },
      },
    }),
  ]);

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
      avatarUrl: p.avatarUrl,
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
