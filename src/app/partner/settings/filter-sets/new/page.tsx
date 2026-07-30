import { prisma } from "@/lib/db";
import { FilterSetEditorPage } from "@/components/filter-sets/filter-set-editor-page";
import {
  listFilterSetTemplates,
  serializeTemplatePickerItemForPartner,
} from "@/lib/filter-sets/templates";
import { getLeadFilterCriteriaOptions } from "@/lib/filter-sets/criteria-options";

const DEFAULT_FORM = {
  name: "",
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
  const [categories, templateRows, criteriaOptions] = await Promise.all([
    prisma.leadCategory.findMany({
      orderBy: { createdAt: "asc" },
      select: { type: true, label: true },
    }),
    listFilterSetTemplates(),
    getLeadFilterCriteriaOptions(),
  ]);

  const categoryOptions =
    categories.length > 0 ? categories : [];

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
      criteriaOptions={criteriaOptions}
      showTemplatePicker
      initialTemplates={templateRows.map(serializeTemplatePickerItemForPartner)}
    />
  );
}
