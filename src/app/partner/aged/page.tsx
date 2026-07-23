import { Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import { PartnerAgedView } from "@/components/partner/partner-aged";
import { getDefaultAgedPrice } from "@/lib/settings/app-settings";
import { parsePageParams } from "@/lib/pagination";
import {
  buildAdminAgedLeadsWhere,
  parseAdminAgedLeadFilters,
} from "@/lib/admin/admin-aged-leads-filters";

export default async function PartnerAgedPage({
  searchParams,
}: {
  searchParams: { state?: string; type?: string; age?: string; page?: string };
}) {
  const partnerId = await getPartnerId();
  if (!partnerId) redirect("/onboarding");

  const filters = parseAdminAgedLeadFilters({
    state: searchParams.state,
    type: searchParams.type,
    age: searchParams.age,
  });
  const agedWhere = await buildAdminAgedLeadsWhere(filters);

  const { page, pageSize, skip } = parsePageParams(searchParams);

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
          intent: lead.intent ?? (lead.leadType === "high_intent_iul" ? "High Intent" : "Traditional"),
          haveIul: lead.haveIul,
          primaryGoal: lead.primaryGoal,
        }))}
      />
    </Suspense>
  );
}
