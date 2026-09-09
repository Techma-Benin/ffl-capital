import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import { FilterSetEditorPage } from "@/components/filter-sets/filter-set-editor-page";
import { toFormData } from "@/components/filter-sets/filter-set-types";
import { getLeadFilterCriteriaOptions } from "@/lib/filter-sets/criteria-options";
import { loadPartnerAvailableCategoryLabels } from "@/lib/lead-categories/partner-availability";
import type { FilterCriteria } from "@/lib/matching/types";

export default async function PartnerFilterSetEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const partnerId = await getPartnerId();
  if (!partnerId) redirect("/onboarding");

  const [filterSet, categories, criteriaOptions] = await Promise.all([
    prisma.partnerFilterSet.findFirst({
      where: { id, partnerId, isTemplate: false },
    }),
    loadPartnerAvailableCategoryLabels(),
    getLeadFilterCriteriaOptions(),
  ]);

  if (!filterSet) notFound();

  const categoryOptions = [...categories];
  if (
    filterSet.leadType &&
    !categoryOptions.some((category) => category.type === filterSet.leadType)
  ) {
    const current = await prisma.leadCategory.findUnique({
      where: { type: filterSet.leadType },
      select: { type: true, label: true },
    });
    if (current) categoryOptions.push(current);
  }

  return (
    <FilterSetEditorPage
      mode="edit"
      apiScope="partner"
      variant="partner"
      filterSetId={filterSet.id}
      filterSetName={filterSet.name}
      filterSetActive={filterSet.active}
      backHref="/partner/settings#filters"
      backLabel="Back to settings"
      subtitle={filterSet.name}
      initial={toFormData({
        id: filterSet.id,
        name: filterSet.name,
        leadType: filterSet.leadType,
        filterStates: filterSet.filterStates,
        priority: filterSet.priority,
        priceOverride: filterSet.priceOverride
          ? Number(filterSet.priceOverride)
          : null,
        active: filterSet.active,
        // Delivery limits are admin/template-only; partners never see or edit
        // them, so this form is always hydrated without the real values.
        weeklyLimit: null,
        monthlyLimit: null,
        filterCriteria: (filterSet.filterCriteria ?? {}) as FilterCriteria,
      })}
      categories={categoryOptions}
      criteriaOptions={criteriaOptions}
    />
  );
}
