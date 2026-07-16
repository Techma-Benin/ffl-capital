import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { getDefaultRealtimePrice } from "@/lib/settings/app-settings";
import { getEffectivePrice, getFilterSetUsage } from "@/lib/matching/eligibility";
import { FilterSetTemplateManager } from "@/components/admin/filter-set-template-manager";
import { FilterListTable } from "@/components/admin/filter-list-table";

export default async function AdminFilterListPage() {
  const defaultPrice = await getDefaultRealtimePrice();
  const filterSets = await prisma.partnerFilterSet.findMany({
    include: {
      partner: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          walletBalance: true,
        },
      },
    },
    orderBy: [{ priority: "desc" }, { partner: { createdAt: "asc" } }],
  });

  const rows = await Promise.all(
    filterSets.map(async (fs) => {
      const usage = await getFilterSetUsage(fs.id);
      const price = getEffectivePrice(fs, defaultPrice);
      return {
        fs: {
          ...fs,
          priceOverride: fs.priceOverride != null ? String(fs.priceOverride) : null,
          partner: {
            ...fs.partner,
            walletBalance: String(fs.partner.walletBalance),
          },
        },
        usage,
        price,
      };
    }),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Filter List"
        subtitle="Global view of partner filter sets, pricing, and usage"
      />

      <FilterSetTemplateManager />

      <FilterListTable initialRows={rows} />
    </div>
  );
}
