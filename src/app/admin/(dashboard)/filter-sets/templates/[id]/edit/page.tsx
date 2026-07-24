import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { FilterSetEditorPage } from "@/components/filter-sets/filter-set-editor-page";
import { toFormData } from "@/components/filter-sets/filter-set-types";
import { findFilterSetTemplate } from "@/lib/filter-sets/templates";
import type { FilterCriteria } from "@/lib/matching/types";

export default async function AdminFilterSetTemplateEditPage({
  params,
}: {
  params: { id: string };
}) {
  const [template, categories] = await Promise.all([
    findFilterSetTemplate(params.id),
    prisma.leadCategory.findMany({
      orderBy: { createdAt: "asc" },
      select: { type: true, label: true },
    }),
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
        description: template.description,
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
    />
  );
}
