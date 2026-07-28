import { prisma } from "@/lib/db";
import { FilterSetEditorPage } from "@/components/filter-sets/filter-set-editor-page";
import { emptyForm } from "@/components/filter-sets/filter-set-types";
import { ADMIN_FILTER_LIST_PATH } from "@/lib/filter-sets/routes";
import { getLeadFilterCriteriaOptions } from "@/lib/filter-sets/criteria-options";

export default async function AdminFilterSetTemplateNewPage() {
  const [categories, criteriaOptions] = await Promise.all([
    prisma.leadCategory.findMany({
      orderBy: { createdAt: "asc" },
      select: { type: true, label: true },
    }),
    getLeadFilterCriteriaOptions(),
  ]);

  return (
    <FilterSetEditorPage
      mode="create"
      apiScope="template"
      variant="template"
      backHref={ADMIN_FILTER_LIST_PATH}
      backLabel="Back to filter list"
      subtitle="Create a catalog template partners can use as a starting point."
      initial={emptyForm([])}
      categories={categories}
      criteriaOptions={criteriaOptions}
    />
  );
}
