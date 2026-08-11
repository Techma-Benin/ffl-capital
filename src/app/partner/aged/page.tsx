import { Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import { PartnerAgedView } from "@/components/partner/partner-aged";
import {
  getAgedDaysThreshold,
  getAgedPriceTiers,
  getDefaultAgedPrice,
} from "@/lib/settings/app-settings";
import {
  buildAdminAgedLeadsWhere,
  buildAdminAgedTypeFilterOptions,
  parseAdminAgedLeadFilters,
  parsePartnerAgedClientFilters,
  PARTNER_AGED_CLIENT_LOAD_LIMIT,
} from "@/lib/admin/admin-aged-leads-filters";
import {
  buildAgedAgeFilterOptions,
  resolveAgedPriceForReceivedAt,
} from "@/lib/aged/price-tiers";
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

  const [agedLeads, totalEligible, fallbackPrice, agedDays, tiers, categories] =
    await Promise.all([
      prisma.lead.findMany({
        where: agedWhere,
        orderBy: { receivedAt: "asc" },
        take: PARTNER_AGED_CLIENT_LOAD_LIMIT,
      }),
      prisma.lead.count({ where: agedWhere }),
      getDefaultAgedPrice(),
      getAgedDaysThreshold(),
      getAgedPriceTiers(),
      loadEnabledCategoryLabels(),
    ]);

  const knownTypes = categories.map((category) => category.type);
  const typeFilterOptions = buildAdminAgedTypeFilterOptions(categories);
  const ageFilterOptions = buildAgedAgeFilterOptions(tiers);
  const knownAgeBuckets = tiers.map((t) => String(t.minDays));
  const lowestTierPrice = Math.min(...tiers.map((t) => t.price), fallbackPrice);

  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <PartnerAgedView
        agedDays={agedDays}
        fromPrice={lowestTierPrice}
        ageFilterOptions={ageFilterOptions}
        priceTiers={tiers}
        allAgedLeads={agedLeads.map((lead) => ({
          id: lead.id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          address: lead.address,
          city: lead.city,
          state: lead.state,
          zip: lead.zip,
          dob: lead.dob,
          age: lead.age,
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
          stateYouCurrentlyLiveIn: lead.stateYouCurrentlyLiveIn,
          price: resolveAgedPriceForReceivedAt(
            lead.receivedAt,
            tiers,
            fallbackPrice,
          ),
        }))}
        totalEligible={totalEligible}
        loadCapped={totalEligible > PARTNER_AGED_CLIENT_LOAD_LIMIT}
        initialFilters={parsePartnerAgedClientFilters(
          resolvedSearchParams,
          knownTypes,
          knownAgeBuckets,
        )}
        typeFilterOptions={typeFilterOptions}
      />
    </Suspense>
  );
}
