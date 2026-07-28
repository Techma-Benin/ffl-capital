import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import { FilterSetEditorPage } from "@/components/filter-sets/filter-set-editor-page";
import { toFormData } from "@/components/filter-sets/filter-set-types";
import { getLeadFilterCriteriaOptions } from "@/lib/filter-sets/criteria-options";
import type { FilterCriteria } from "@/lib/matching/types";

export default async function PartnerFilterSetEditPage({
  params,
}: {
  params: { id: string };
}) {
  const partnerId = await getPartnerId();
  if (!partnerId) redirect("/onboarding");

  const [filterSet, categories, criteriaOptions] = await Promise.all([
    prisma.partnerFilterSet.findFirst({
      where: { id: params.id, partnerId, isTemplate: false },
    }),
    prisma.leadCategory.findMany({
      orderBy: { createdAt: "asc" },
      select: { type: true, label: true },
    }),
    getLeadFilterCriteriaOptions(),
  ]);

  if (!filterSet) notFound();

  const categoryOptions =
    categories.length > 0
      ? categories
      : [
          { type: "traditional_iul", label: "Traditional IUL" },
          { type: "high_intent_iul", label: "High Intent IUL" },
        ];

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
        weeklyLimit: null,
        monthlyLimit: null,
        filterCriteria: (filterSet.filterCriteria ?? {}) as FilterCriteria,
      })}
      categories={categoryOptions}
      criteriaOptions={criteriaOptions}
    />
  );
}
