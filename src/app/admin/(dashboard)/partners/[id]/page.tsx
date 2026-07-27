import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/ui/stat-card";
import { PartnerDetailEditProvider } from "@/components/admin/partner-detail-edit-provider";
import { PartnerDetailHeader } from "@/components/admin/partner-detail-header";
import { PartnerFilterSetsPanel } from "@/components/admin/partner-filter-sets-panel";
import { PartnerProfileCard } from "@/components/admin/partner-profile-card";
import { PartnerAccountCrmCard } from "@/components/admin/partner-account-crm-card";
import { PartnerDetailActivity } from "@/components/admin/partner-detail-activity";
import { Funnel, Wallet, UsersThree } from "@/lib/icons/ssr";
import { formatUsd, moneyValueClassName } from "@/lib/format-money";
import { clsx } from "clsx";

export default async function AdminPartnerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const partner = await prisma.partner.findUnique({
    where: { id: params.id },
    include: {
      filterSets: {
        where: { isTemplate: false },
        orderBy: { createdAt: "asc" },
      },
      crmOutboundConfig: true,
      transactions: { orderBy: { createdAt: "desc" }, take: 10 },
      leadDeliveries: {
        orderBy: { deliveredAt: "desc" },
        take: 10,
        include: { lead: true },
      },
      _count: {
        select: {
          leadDeliveries: true,
          filterSets: { where: { active: true, isTemplate: false } },
        },
      },
    },
  });

  if (!partner) notFound();

  const walletBalance = Number(partner.walletBalance);
  const walletLow = walletBalance < 25;
  const displayName = `${partner.firstName} ${partner.lastName}`;
  const filterSetRows = partner.filterSets.map((fs) => ({
    id: fs.id,
    name: fs.name,
    leadType: fs.leadType,
    filterStates: fs.filterStates,
    priority: fs.priority,
    priceOverride: fs.priceOverride ? Number(fs.priceOverride) : null,
    active: fs.active,
    weeklyLimit: fs.weeklyLimit,
    monthlyLimit: fs.monthlyLimit,
    filterCriteria: (fs.filterCriteria ?? {}) as import("@/lib/matching/types").FilterCriteria,
  }));

  const crmMappings = partner.crmOutboundConfig?.fieldMappings;
  const mappingCount = Array.isArray(crmMappings) ? crmMappings.length : 0;

  const editInitial = {
    priority: partner.priority,
    priceOverride: partner.priceOverride ? Number(partner.priceOverride) : null,
    status: partner.status,
  };

  return (
    <PartnerDetailEditProvider
      partnerId={partner.id}
      displayName={displayName}
      editInitial={editInitial}
    >
      <div className="pb-10">
        <PartnerDetailHeader
          title="Partner profile"
          partnerId={partner.id}
          partnerStatus={partner.status}
        />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <aside className="sticky top-6 max-h-[calc(100dvh-3rem)] self-start space-y-3 overflow-y-auto">
          <PartnerProfileCard
            partnerId={partner.id}
            firstName={partner.firstName}
            lastName={partner.lastName}
            email={partner.email}
            status={partner.status}
            affiliation={partner.affiliation}
            createdAt={partner.createdAt}
            walletBalance={walletBalance}
            priority={partner.priority}
            avatarUrl={partner.avatarUrl}
          />

          <div className="card overflow-hidden rounded-xl">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Contact details</h2>
            </div>
            <div className="space-y-3 px-4 py-3">
              {[
                { label: "Email", value: partner.email },
                {
                  label: "Affiliation",
                  value: partner.affiliation ?? "—",
                },
              ].map((field) => (
                <div key={field.label}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {field.label}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {field.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Wallet balance"
              value={formatUsd(walletBalance)}
              icon={Wallet}
              accent={walletLow ? "red" : "emerald"}
              valueClassName={clsx("tabular-nums text-left", walletLow ? "text-red-600" : "text-slate-900")}
              blobIndex={0}
            />
            <StatCard
              label="Leads purchased"
              value={partner._count.leadDeliveries.toLocaleString()}
              icon={UsersThree}
              accent="blue"
              blobIndex={1}
            />
            <StatCard
              label="Filter sets active"
              value={partner._count.filterSets}
              icon={Funnel}
              accent="purple"
              blobIndex={2}
            />
          </div>

          <PartnerAccountCrmCard
            crmOutboundEnabled={partner.crmOutboundConfig?.enabled ?? false}
            crmOutboundEndpointUrl={partner.crmOutboundConfig?.endpointUrl ?? null}
            crmOutboundMappingCount={mappingCount}
            walletBalance={walletBalance}
          />

          <PartnerFilterSetsPanel
            partnerId={partner.id}
            defaultStates={partner.filterStates}
            filterSets={filterSetRows}
            layout="document"
          />

          <PartnerDetailActivity
            deliveries={partner.leadDeliveries.map((d) => ({
              id: d.id,
              deliveredAt: d.deliveredAt,
              price: Number(d.price),
              channel: d.channel,
              lead: {
                firstName: d.lead.firstName,
                lastName: d.lead.lastName,
                state: d.lead.state,
              },
            }))}
            transactions={partner.transactions.map((t) => ({
              id: t.id,
              createdAt: t.createdAt,
              type: t.type,
              amount: Number(t.amount),
              balanceAfter: Number(t.balanceAfter),
            }))}
          />
        </div>
      </div>
      </div>
    </PartnerDetailEditProvider>
  );
}
