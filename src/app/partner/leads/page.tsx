import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PartnerLeadsTable } from "@/components/partner/partner-leads-table";
import { FilterSetFilter } from "@/components/partner/filter-set-filter";
import { StatCard } from "@/components/ui/stat-card";
import { TablePagination } from "@/components/ui/table-pagination";
import { parsePageParams } from "@/lib/pagination";
import { FileText } from "@phosphor-icons/react/dist/ssr";

export default async function PartnerLeadsPage({
  searchParams,
}: {
  searchParams: { page?: string; filterSetId?: string };
}) {
  const partnerId = await getPartnerId();
  if (!partnerId) redirect("/onboarding");

  const { page, pageSize, skip } = parsePageParams(searchParams);
  const filterSetId = searchParams.filterSetId ?? null;

  // Validate the filterSetId belongs to this partner (ignore invalid values)
  const validatedFilterSetId =
    filterSetId
      ? (await prisma.partnerFilterSet.findFirst({
          where: { id: filterSetId, partnerId },
          select: { id: true },
        }))?.id ?? null
      : null;

  const where = {
    partnerId,
    ...(validatedFilterSetId ? { filterSetId: validatedFilterSetId } : {}),
  };

  const [total, deliveries, filterSets] = await Promise.all([
    prisma.leadDelivery.count({ where }),
    prisma.leadDelivery.findMany({
      where,
      include: { lead: true, refundRequests: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { deliveredAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.partnerFilterSet.findMany({
      where: { partnerId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, leadType: true, active: true },
    }),
  ]);

  const allForStats = await prisma.leadDelivery.findMany({
    where,
    select: { price: true, refundedAt: true },
  });
  const totalSpent = allForStats.reduce((sum, d) => sum + Number(d.price), 0);
  const refundedCount = allForStats.filter((d) => d.refundedAt).length;

  return (
    <div>
      <PageHeader
        title="My Leads"
        subtitle="All leads delivered to your account — request refunds individually or in bulk"
      />


      <div className="card">
        {filterSets.length > 0 && (
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
            <span className="text-xs font-medium text-slate-500">Filter by:</span>
            <FilterSetFilter
              filterSets={filterSets}
              currentFilterSetId={validatedFilterSetId}
            />
          </div>
        )}

        <div className="overflow-x-auto">
          {deliveries.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={validatedFilterSetId ? "No leads for this filter set" : "No leads delivered yet"}
              description={
                validatedFilterSetId
                  ? "No deliveries match this filter set. Try selecting a different one or view all."
                  : "Once your account is active and funded, leads matching your states will be delivered automatically."
              }
            />
          ) : (
            <PartnerLeadsTable
              deliveries={deliveries.map((d) => {
                const refundReq = d.refundRequests[0];
                const isRefunded = !!d.refundedAt;
                const canRefund =
                  d.lead.refundable && !isRefunded && !refundReq;
                return {
                  id: d.id,
                  price: Number(d.price),
                  channel: d.channel,
                  deliveredAt: d.deliveredAt.toISOString(),
                  refundedAt: d.refundedAt?.toISOString() ?? null,
                  canRefund,
                  refundStatus: refundReq?.status ?? null,
                  lead: {
                    firstName: d.lead.firstName,
                    lastName: d.lead.lastName,
                    email: d.lead.email,
                    phone: d.lead.phone,
                    state: d.lead.state,
                    address: d.lead.address,
                    leadType: d.lead.leadType,
                    intent: d.lead.intent,
                    haveIul: d.lead.haveIul,
                    primaryGoal: d.lead.primaryGoal,
                    refundable: d.lead.refundable,
                    trustedformCertUrl: d.lead.trustedformCertUrl,
                  },
                };
              })}
            />
          )}
        </div>
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          basePath="/partner/leads"
          searchParams={searchParams}
        />
      </div>
    </div>
  );
}
