import { FilterSetEditorPage } from "@/components/filter-sets/filter-set-editor-page";
import {
  listFilterSetTemplates,
  serializeTemplatePickerItemForPartner,
} from "@/lib/filter-sets/templates";
import { getLeadFilterCriteriaOptions } from "@/lib/filter-sets/criteria-options";
import { loadPartnerAvailableCategoryLabels } from "@/lib/lead-categories/partner-availability";

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
    loadPartnerAvailableCategoryLabels(),
    listFilterSetTemplates(),
    getLeadFilterCriteriaOptions(),
  ]);

  const availableTypes = new Set(categories.map((category) => category.type));
  const templates = templateRows.filter((row) => availableTypes.has(row.leadType));
  const defaultLeadType = categories[0]?.type ?? "traditional_iul";

  return (
    <FilterSetEditorPage
      mode="create"
      apiScope="partner"
      variant="partner"
      backHref="/partner/settings#filters"
      backLabel="Back to settings"
      subtitle="Define targeting rules for your lead delivery."
      initial={{ ...DEFAULT_FORM, leadType: defaultLeadType }}
      categories={categories}
      criteriaOptions={criteriaOptions}
      showTemplatePicker
      initialTemplates={templates.map(serializeTemplatePickerItemForPartner)}
    />
  );
}
