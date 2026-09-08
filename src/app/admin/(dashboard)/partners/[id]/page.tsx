import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { getClerkPartnerImageUrl } from "@/lib/auth/clerk-profile";
import { isSuperAdminFromMetadata } from "@/lib/auth/roles";
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
import { getRemainingUnusedAdminCredit } from "@/lib/wallet/remaining-admin-credit";
import { clsx } from "clsx";

export default async function AdminPartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const adminUser = await currentUser();
  const isSuperAdmin = isSuperAdminFromMetadata(
    adminUser?.publicMetadata as Record<string, unknown>,
  );

  const partner = await prisma.partner.findUnique({
    where: { id },
    include: {
      filterSets: {
        where: { isTemplate: false },
        orderBy: { createdAt: "asc" },
      },
      crmOutboundConfig: true,
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          leadDelivery: {
            include: {
              lead: { select: { firstName: true, lastName: true } },
            },
          },
        },
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

  const avatarUrl = await getClerkPartnerImageUrl(partner.clerkUserId);

  const walletBalance = Number(partner.walletBalance);
  const remainingUnusedCredit = await getRemainingUnusedAdminCredit(
    partner.id,
    walletBalance,
  );
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
          displayName={displayName}
          isSuperAdmin={isSuperAdmin}
          currentBalance={walletBalance}
          remainingUnusedCredit={remainingUnusedCredit}
        />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <aside className="space-y-3 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto">
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
            avatarUrl={avatarUrl}
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
            transactions={partner.transactions.map((t) => ({
              id: t.id,
              createdAt: t.createdAt,
              type: t.type,
              amount: Number(t.amount),
              balanceAfter: Number(t.balanceAfter),
              description: t.description ?? null,
              leadName: t.leadDelivery?.lead
                ? `${t.leadDelivery.lead.firstName} ${t.leadDelivery.lead.lastName}`
                : null,
            }))}
          />
        </div>
      </div>
      </div>
    </PartnerDetailEditProvider>
  );
}
