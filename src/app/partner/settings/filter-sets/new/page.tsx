import { FilterSetEditorPage } from "@/components/filter-sets/filter-set-editor-page";
import type { CategoryOption } from "@/components/filter-sets/filter-set-form";

const PARTNER_CATEGORIES: CategoryOption[] = [
  { type: "traditional_iul", label: "Traditional IUL" },
  { type: "high_intent_iul", label: "High Intent IUL" },
];

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

export default function PartnerFilterSetNewPage() {
  return (
    <FilterSetEditorPage
      mode="create"
      apiScope="partner"
      backHref="/partner/settings#filters"
      backLabel="Back to settings"
      subtitle="Define targeting rules for your lead delivery."
      initial={DEFAULT_FORM}
      categories={PARTNER_CATEGORIES}
      showTemplatePicker
    />
  );
}
