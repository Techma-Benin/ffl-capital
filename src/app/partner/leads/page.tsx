import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PartnerLeadsTable } from "@/components/partner/partner-leads-table";
import { StatCard } from "@/components/ui/stat-card";
import { TablePagination } from "@/components/ui/table-pagination";
import { parsePageParams } from "@/lib/pagination";
import { FileText } from "@phosphor-icons/react/dist/ssr";

export default async function PartnerLeadsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const partnerId = await getPartnerId();
  if (!partnerId) redirect("/onboarding");

  const { page, pageSize, skip } = parsePageParams(searchParams);

  const [total, deliveries] = await Promise.all([
    prisma.leadDelivery.count({ where: { partnerId } }),
    prisma.leadDelivery.findMany({
      where: { partnerId },
      include: { lead: true, refundRequests: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { deliveredAt: "desc" },
      skip,
      take: pageSize,
    }),
  ]);

  const allForStats = await prisma.leadDelivery.findMany({
    where: { partnerId },
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

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Delivered" value={total} variant="blue" />
        <StatCard
          label="Total Spent"
          value={`$${totalSpent.toFixed(2)}`}
          variant="mint"
        />
        <StatCard label="Refunded" value={refundedCount} variant="orange" />
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          {deliveries.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No leads delivered yet"
              description="Once your account is active and funded, leads matching your states will be delivered automatically."
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
