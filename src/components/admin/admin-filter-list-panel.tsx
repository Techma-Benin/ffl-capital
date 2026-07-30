import { prisma } from "@/lib/db";
import { getDefaultRealtimePrice } from "@/lib/settings/app-settings";
import {
  getEffectivePrice,
  getFilterSetUsageBatch,
} from "@/lib/matching/eligibility";
import { FilterSetTemplateManager } from "@/components/admin/filter-set-template-manager";
import { FilterListTable } from "@/components/admin/filter-list-table";
import { loadEnabledCategoryLabels } from "@/lib/lead-categories/category-labels";
import {
  listFilterSetTemplates,
  serializeTemplatePickerItem,
} from "@/lib/filter-sets/templates";
import type { FilterCriteria } from "@/lib/matching/types";

export async function AdminFilterListPanel() {
  const [defaultPrice, filterSets, sourceRows, templateRows, categories] = await Promise.all([
    getDefaultRealtimePrice(),
    prisma.partnerFilterSet.findMany({
      where: { isTemplate: false },
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
    }),
    prisma.leadCategoryCriterion.findMany({
      where: { field: "SRC" },
      select: { value: true },
      orderBy: { createdAt: "asc" },
    }),
    listFilterSetTemplates(),
    loadEnabledCategoryLabels(),
  ]);

  const categoryLabelByType = Object.fromEntries(
    categories.map((category) => [category.type, category.label]),
  );

  const sources = Array.from(
    new Set(sourceRows.map((r) => r.value).filter(Boolean)),
  );

  const usageById = await getFilterSetUsageBatch(filterSets.map((fs) => fs.id));

  const rows = filterSets.map((fs) => {
    const usage = usageById.get(fs.id) ?? { weekly: 0, monthly: 0 };
    const price = getEffectivePrice(fs, defaultPrice);
    return {
      fs: {
        ...fs,
        partnerId: fs.partnerId!,
        priceOverride: fs.priceOverride != null ? String(fs.priceOverride) : null,
        filterCriteria: (fs.filterCriteria ?? {}) as FilterCriteria,
        partner: {
          ...fs.partner!,
          walletBalance: String(fs.partner!.walletBalance),
        },
      },
      usage,
      price,
    };
  });

  const templates = templateRows.map((t) => {
    const item = serializeTemplatePickerItem(t);
    return {
      id: item.id,
      name: item.name,
      leadType: item.leadType,
      filterStates: item.filterStates,
    };
  });

  return (
    <div className="space-y-8">
      <FilterSetTemplateManager
        initialTemplates={templates}
        categoryLabelByType={categoryLabelByType}
      />
      <FilterListTable
        initialRows={rows}
        sources={sources}
        categoryLabelByType={categoryLabelByType}
      />
    </div>
  );
}
