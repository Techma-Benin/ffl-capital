import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PartnerLeadsTable } from "@/components/partner/partner-leads-table";
import { LeadsFilterBar } from "@/components/partner/leads-filter-bar";
import { TablePagination } from "@/components/ui/table-pagination";
import { parsePageParams } from "@/lib/pagination";
import { FileText } from "@/lib/icons/ssr";

export default async function PartnerLeadsPage({
  searchParams,
}: {
  searchParams: {
    page?: string;
    filterSetId?: string;
    loc?: string;
    ch?: string;
    type?: string;
    status?: string;
  };
}) {
  const partnerId = await getPartnerId();
  if (!partnerId) redirect("/onboarding");

  const { page, pageSize, skip } = parsePageParams(searchParams);

  // Parse multi-value filters (comma-separated)
  const locations = searchParams.loc?.split(",").filter(Boolean) ?? [];
  const channels = searchParams.ch?.split(",").filter(Boolean) ?? [];
  const types = searchParams.type?.split(",").filter(Boolean) ?? [];
  const statuses = searchParams.status?.split(",").filter(Boolean) ?? [];

  // Validate filterSetId belongs to this partner
  const filterSetId = searchParams.filterSetId ?? null;
  const validatedFilterSetId = filterSetId
    ? (await prisma.partnerFilterSet.findFirst({
        where: { id: filterSetId, partnerId },
        select: { id: true },
      }))?.id ?? null
    : null;

  // Build lead sub-filter
  const leadWhere: Record<string, unknown> = {};
  if (locations.length) leadWhere.state = { in: locations };
  if (types.length) leadWhere.leadType = { in: types };

  // Build status OR conditions
  const statusConditions: Record<string, unknown>[] = [];
  if (!statuses.length || statuses.includes("active"))
    statusConditions.push({ refundedAt: null, refundRequests: { none: {} } });
  if (!statuses.length || statuses.includes("refund_pending"))
    statusConditions.push({ refundedAt: null, refundRequests: { some: {} } });
  if (!statuses.length || statuses.includes("refunded"))
    statusConditions.push({ refundedAt: { not: null } });

  const where: Record<string, unknown> = {
    partnerId,
    ...(validatedFilterSetId ? { filterSetId: validatedFilterSetId } : {}),
    ...(Object.keys(leadWhere).length ? { lead: leadWhere } : {}),
    ...(channels.length ? { channel: { in: channels } } : {}),
    // Only add OR when not all statuses selected (avoids unnecessary clause)
    ...(statuses.length && statuses.length < 3 ? { OR: statusConditions } : {}),
  };

  const [total, deliveries, filterSets, distinctStatesRaw] = await Promise.all([
    prisma.leadDelivery.count({ where }),
    prisma.leadDelivery.findMany({
      where,
      include: {
        lead: true,
        refundRequests: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { deliveredAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.partnerFilterSet.findMany({
      where: { partnerId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.lead.findMany({
      where: { leadDeliveries: { some: { partnerId } } },
      select: { state: true },
      distinct: ["state"],
      orderBy: { state: "asc" },
    }),
  ]);

  const availableStates = distinctStatesRaw.map((l) => l.state);

  return (
    <div>
      <PageHeader
        title="My Leads"
        subtitle="All leads delivered to your account — request refunds individually or in bulk"
        badge={
          <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-sm font-semibold text-brand-700">
            {total}
          </span>
        }
      />

      <LeadsFilterBar
        filterSets={filterSets}
        availableStates={availableStates}
        currentSelections={{
          filterSetId: validatedFilterSetId,
          locations,
          channels,
          types,
          statuses,
        }}
      />

      {deliveries.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FileText}
            title="No leads match these filters"
            description="Try adjusting or clearing your filters to see more results."
            accent="blue"
          />
        </div>
      ) : (
        <>
          <PartnerLeadsTable
            deliveries={deliveries.map((d) => {
              const refundReq = d.refundRequests[0];
              const isRefunded = !!d.refundedAt;
              const canRefund = d.lead.refundable && !isRefunded && !refundReq;
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
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            basePath="/partner/leads"
            searchParams={searchParams}
          />
        </>
      )}
    </div>
  );
}
