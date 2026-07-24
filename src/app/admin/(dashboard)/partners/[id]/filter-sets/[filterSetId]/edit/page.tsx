import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { FilterSetEditorPage } from "@/components/filter-sets/filter-set-editor-page";
import { toFormData } from "@/components/filter-sets/filter-set-types";
import { isSafeReturnTo } from "@/lib/filter-sets/routes";
import type { FilterCriteria } from "@/lib/matching/types";

export default async function AdminPartnerFilterSetEditPage({
  params,
  searchParams,
}: {
  params: { id: string; filterSetId: string };
  searchParams: { returnTo?: string };
}) {
  const [partner, filterSet, categories] = await Promise.all([
    prisma.partner.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    }),
    prisma.partnerFilterSet.findFirst({
      where: {
        id: params.filterSetId,
        partnerId: params.id,
        isTemplate: false,
      },
    }),
    prisma.leadCategory.findMany({
      orderBy: { createdAt: "asc" },
      select: { type: true, label: true },
    }),
  ]);

  if (!partner || !filterSet) notFound();

  const returnTo = isSafeReturnTo(searchParams.returnTo)
    ? searchParams.returnTo
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
      showSaveAsTemplate
    />
  );
}
