import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { FilterSetEditorPage } from "@/components/filter-sets/filter-set-editor-page";
import { toFormData } from "@/components/filter-sets/filter-set-types";
import { findFilterSetTemplate } from "@/lib/filter-sets/templates";
import { getLeadFilterCriteriaOptions } from "@/lib/filter-sets/criteria-options";
import type { FilterCriteria } from "@/lib/matching/types";

export default async function AdminFilterSetTemplateEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [template, categories, criteriaOptions] = await Promise.all([
    findFilterSetTemplate(id),
    prisma.leadCategory.findMany({
      orderBy: { createdAt: "asc" },
      select: { type: true, label: true },
    }),
    getLeadFilterCriteriaOptions(),
  ]);

  if (!template) notFound();

  return (
    <FilterSetEditorPage
      mode="edit"
      apiScope="template"
      variant="template"
      filterSetId={template.id}
      filterSetName={template.name}
      filterSetActive={template.active}
      backHref="/admin/filter-list"
      backLabel="Back to filter list"
      subtitle={template.name}
      initial={toFormData({
        id: template.id,
        name: template.name,
        leadType: template.leadType,
        filterStates: template.filterStates,
        priority: template.priority,
        priceOverride:
          template.priceOverride != null ? Number(template.priceOverride) : null,
        active: template.active,
        weeklyLimit: template.weeklyLimit,
        monthlyLimit: template.monthlyLimit,
        filterCriteria: (template.filterCriteria ?? {}) as FilterCriteria,
      })}
      categories={categories}
      criteriaOptions={criteriaOptions}
    />
  );
}
