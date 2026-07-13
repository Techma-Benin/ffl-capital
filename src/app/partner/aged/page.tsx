import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LeadType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import { PartnerAgedView } from "@/components/partner/partner-aged";
import { buildAgedLeadWhere } from "@/lib/aged/eligibility";
import { getDefaultAgedPrice } from "@/lib/settings/app-settings";
import { parsePageParams } from "@/lib/pagination";

export default async function PartnerAgedPage({
  searchParams,
}: {
  searchParams: { state?: string; type?: string; age?: string; page?: string };
}) {
  const partnerId = await getPartnerId();
  if (!partnerId) redirect("/onboarding");

  const targeting = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: { filterStates: true, leadType: true },
  });
  if (!targeting) redirect("/onboarding");

  const extra: Prisma.LeadWhereInput = {
    state: {
      in: targeting.filterStates.length > 0 ? targeting.filterStates : ["__none__"],
    },
    leadType: targeting.leadType,
  };

  if (searchParams.state) extra.state = searchParams.state;
  if (searchParams.type) extra.leadType = searchParams.type as LeadType;

  if (searchParams.age) {
    const minDays = Number(searchParams.age);
    const maxCutoff = new Date();
    maxCutoff.setDate(maxCutoff.getDate() - minDays);

    if (searchParams.age === "30") {
      const minCutoff = new Date();
      minCutoff.setDate(minCutoff.getDate() - 60);
      extra.receivedAt = { lte: maxCutoff, gte: minCutoff };
    } else if (searchParams.age === "60") {
      const minCutoff = new Date();
      minCutoff.setDate(minCutoff.getDate() - 90);
      extra.receivedAt = { lte: maxCutoff, gte: minCutoff };
    } else {
      extra.receivedAt = { lte: maxCutoff };
    }
  }

  const { page, pageSize, skip } = parsePageParams(searchParams);

  const agedWhere = await buildAgedLeadWhere(extra);

  const [agedLeads, total, agedPrice] = await Promise.all([
    prisma.lead.findMany({
      where: agedWhere,
      orderBy: { receivedAt: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.lead.count({ where: agedWhere }),
    getDefaultAgedPrice(),
  ]);

  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <PartnerAgedView
        agedPrice={agedPrice}
        total={total}
        page={page}
        pageSize={pageSize}
        paginationParams={searchParams}
        agedLeads={agedLeads.map((lead) => ({
          id: lead.id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          state: lead.state,
          address: lead.address,
          leadType: lead.leadType,
          receivedAt: lead.receivedAt.toISOString(),
          trustedformCertUrl: lead.trustedformCertUrl,
          intent: lead.intent ?? (lead.leadType === "high_intent_iul" ? "High Intent" : "Traditional"),
          haveIul: lead.haveIul,
          primaryGoal: lead.primaryGoal,
        }))}
      />
    </Suspense>
  );
}
