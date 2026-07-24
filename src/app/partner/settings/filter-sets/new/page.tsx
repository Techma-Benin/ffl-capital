import { prisma } from "@/lib/db";
import { FilterSetEditorPage } from "@/components/filter-sets/filter-set-editor-page";
import {
  listFilterSetTemplates,
  serializeTemplateRow,
} from "@/lib/filter-sets/templates";

const DEFAULT_FORM = {
  name: "",
  description: "",
  leadType: "traditional_iul",
  filterStates: [] as string[],
  priority: 5,
  priceOverride: "",
  active: true,
  weeklyLimit: "",
  monthlyLimit: "",
  filterCriteria: {},
};

export default async function PartnerFilterSetNewPage() {
  const [categories, templateRows] = await Promise.all([
    prisma.leadCategory.findMany({
      orderBy: { createdAt: "asc" },
      select: { type: true, label: true },
    }),
    listFilterSetTemplates(),
  ]);

  const categoryOptions =
    categories.length > 0
      ? categories
      : [
          { type: "traditional_iul", label: "Traditional IUL" },
          { type: "high_intent_iul", label: "High Intent IUL" },
        ];

  return (
    <FilterSetEditorPage
      mode="create"
      apiScope="partner"
      variant="partner"
      backHref="/partner/settings#filters"
      backLabel="Back to settings"
      subtitle="Define targeting rules for your lead delivery."
      initial={DEFAULT_FORM}
      categories={categoryOptions}
      showTemplatePicker
      initialTemplates={templateRows.map(serializeTemplateRow)}
    />
  );
}
