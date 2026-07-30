import { Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import { PartnerAgedView } from "@/components/partner/partner-aged";
import { getAgedDaysThreshold, getDefaultAgedPrice } from "@/lib/settings/app-settings";
import {
  buildAdminAgedLeadsWhere,
  buildAdminAgedTypeFilterOptions,
  parseAdminAgedLeadFilters,
  parsePartnerAgedClientFilters,
  PARTNER_AGED_CLIENT_LOAD_LIMIT,
} from "@/lib/admin/admin-aged-leads-filters";
import {
  loadEnabledCategoryLabels,
  resolveLeadTypeDisplay,
} from "@/lib/lead-categories/category-labels";

export default async function PartnerAgedPage({
  searchParams,
}: {
  searchParams: Promise<{
    state?: string;
    type?: string;
    age?: string;
    haveIul?: string;
    page?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const partnerId = await getPartnerId();
  if (!partnerId) redirect("/onboarding");

  const agedWhere = await buildAdminAgedLeadsWhere(parseAdminAgedLeadFilters({}));

  const [agedLeads, totalEligible, agedPrice, agedDays, categories] = await Promise.all([
    prisma.lead.findMany({
      where: agedWhere,
      orderBy: { receivedAt: "asc" },
      take: PARTNER_AGED_CLIENT_LOAD_LIMIT,
    }),
    prisma.lead.count({ where: agedWhere }),
    getDefaultAgedPrice(),
    getAgedDaysThreshold(),
    loadEnabledCategoryLabels(),
  ]);

  const knownTypes = categories.map((category) => category.type);
  const typeFilterOptions = buildAdminAgedTypeFilterOptions(categories);

  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <PartnerAgedView
        agedDays={agedDays}
        agedPrice={agedPrice}
        allAgedLeads={agedLeads.map((lead) => ({
          id: lead.id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          state: lead.state,
          address: lead.address,
          leadType: lead.leadType ?? "",
          leadTypeLabel: resolveLeadTypeDisplay({
            leadType: lead.leadType,
            categoryResolution: lead.categoryResolution,
            categoryCandidateTypes: lead.categoryCandidateTypes,
            categories,
          }).label,
          receivedAt: lead.receivedAt.toISOString(),
          intent: lead.intent ?? "",
          haveIul: lead.haveIul,
          primaryGoal: lead.primaryGoal,
        }))}
        totalEligible={totalEligible}
        loadCapped={totalEligible > PARTNER_AGED_CLIENT_LOAD_LIMIT}
        initialFilters={parsePartnerAgedClientFilters(
          resolvedSearchParams,
          knownTypes,
        )}
        typeFilterOptions={typeFilterOptions}
      />
    </Suspense>
  );
}
