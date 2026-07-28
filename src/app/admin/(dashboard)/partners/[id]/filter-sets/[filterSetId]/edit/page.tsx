import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { FilterSetEditorPage } from "@/components/filter-sets/filter-set-editor-page";
import { toFormData } from "@/components/filter-sets/filter-set-types";
import { isSafeReturnTo } from "@/lib/filter-sets/routes";
import { getLeadFilterCriteriaOptions } from "@/lib/filter-sets/criteria-options";
import type { FilterCriteria } from "@/lib/matching/types";

export default async function AdminPartnerFilterSetEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; filterSetId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { id, filterSetId } = await params;
  const { returnTo: returnToRaw } = await searchParams;
  const [partner, filterSet, categories, criteriaOptions] = await Promise.all([
    prisma.partner.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    }),
    prisma.partnerFilterSet.findFirst({
      where: {
        id: filterSetId,
        partnerId: id,
        isTemplate: false,
      },
    }),
    prisma.leadCategory.findMany({
      orderBy: { createdAt: "asc" },
      select: { type: true, label: true },
    }),
    getLeadFilterCriteriaOptions(),
  ]);

  if (!partner || !filterSet) notFound();

  const returnTo = isSafeReturnTo(returnToRaw)
    ? returnToRaw
    : `/admin/partners/${partner.id}`;
  const displayName = `${partner.firstName} ${partner.lastName}`.trim();

  return (
    <FilterSetEditorPage
      mode="edit"
      variant="admin"
      partnerId={partner.id}
      filterSetId={filterSet.id}
      filterSetName={filterSet.name}
      filterSetActive={filterSet.active}
      backHref={returnTo}
      backLabel={
        returnTo === "/admin/filter-list" ? "Back to filter list" : "Back to partner"
      }
      subtitle={`${displayName} · ${filterSet.name}`}
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
        weeklyLimit: filterSet.weeklyLimit,
        monthlyLimit: filterSet.monthlyLimit,
        filterCriteria: (filterSet.filterCriteria ?? {}) as FilterCriteria,
      })}
      categories={categories}
      criteriaOptions={criteriaOptions}
      showSaveAsTemplate
    />
  );
}
