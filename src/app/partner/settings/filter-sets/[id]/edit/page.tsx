import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import { FilterSetEditorPage } from "@/components/filter-sets/filter-set-editor-page";
import { toFormData } from "@/components/filter-sets/filter-set-form";
import type { CategoryOption } from "@/components/filter-sets/filter-set-form";
import type { FilterCriteria } from "@/lib/matching/types";

const PARTNER_CATEGORIES: CategoryOption[] = [
  { type: "traditional_iul", label: "Traditional IUL" },
  { type: "high_intent_iul", label: "High Intent IUL" },
];

export default async function PartnerFilterSetEditPage({
  params,
}: {
  params: { id: string };
}) {
  const partnerId = await getPartnerId();
  if (!partnerId) redirect("/onboarding");

  const filterSet = await prisma.partnerFilterSet.findFirst({
    where: { id: params.id, partnerId },
  });

  if (!filterSet) notFound();

  return (
    <FilterSetEditorPage
      mode="edit"
      apiScope="partner"
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
        priceOverride: filterSet.priceOverride ? Number(filterSet.priceOverride) : null,
        active: filterSet.active,
        weeklyLimit: filterSet.weeklyLimit,
        monthlyLimit: filterSet.monthlyLimit,
        filterCriteria: (filterSet.filterCriteria ?? {}) as FilterCriteria,
      })}
      categories={PARTNER_CATEGORIES}
    />
  );
}
