import { Suspense } from "react";
import { LeadStatus, Prisma } from "@prisma/client";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "@/lib/icons/ssr";
import { FilterTabLink } from "@/components/ui/filter-tab-link";
import { PortalLink } from "@/components/ui/portal-link";
import { AdminLeadsFilters } from "@/components/admin/admin-leads-filters";
import { LeadReprocessButton } from "@/components/admin/lead-reprocess-button";
import { LeadsExportButton } from "@/components/admin/leads-export-button";
import { TablePagination } from "@/components/ui/table-pagination";
import { parsePageParams } from "@/lib/pagination";
import { formatDateTime } from "@/lib/format-datetime";
import { buildAgedLeadWhere } from "@/lib/aged/eligibility";
import { ClickableRow } from "@/components/ui/clickable-row";

type StatusFilter = "all" | "matched" | "unmatched" | "integrity_posted" | "aged_listed";

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: "All Leads", value: "all" },
  { label: "Matched", value: "matched" },
  { label: "Unmatched", value: "unmatched" },
  { label: "Integrity", value: "integrity_posted" },
  { label: "Aged Listed", value: "aged_listed" },
];

function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function buildSearchWhere(q: string): Prisma.LeadWhereInput {
  const phoneDigits = normalizePhoneDigits(q);
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);

  const orConditions: Prisma.LeadWhereInput[] = [
    ...(isUuid ? [{ id: q }] : []),
    { externalId: q },
    { email: { contains: q, mode: "insensitive" } },
  ];

  if (phoneDigits.length >= 7) {
    orConditions.push({ phone: { contains: phoneDigits } });
  }

  return { OR: orConditions };
}

async function buildWhere(
  statusFilter: StatusFilter | undefined,
  state?: string,
  from?: string,
  to?: string,
  q?: string,
): Promise<Prisma.LeadWhereInput> {
  if (q?.trim()) {
    return buildSearchWhere(q.trim());
  }

  let where: Prisma.LeadWhereInput = {};

  if (statusFilter === "matched") {
    where.status = LeadStatus.delivered;
  } else if (statusFilter === "unmatched") {
    where.status = LeadStatus.unmatched;
  } else if (statusFilter === "integrity_posted") {
    where.status = LeadStatus.integrity_posted;
  } else if (statusFilter === "aged_listed") {
    where = await buildAgedLeadWhere();
  }

  if (state) where.state = state;
  if (from || to) {
    where.receivedAt = {};
    if (from) where.receivedAt.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      where.receivedAt.lte = end;
    }
  }

  return where;
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: {
    status?: string;
    state?: string;
    from?: string;
    to?: string;
    q?: string;
    page?: string;
  };
}) {
  const statusFilter = searchParams.status as StatusFilter | undefined;
  const searchQuery = searchParams.q?.trim();
  const { page, pageSize, skip } = parsePageParams(searchParams);
  const whereClause = await buildWhere(
    statusFilter,
    searchParams.state,
    searchParams.from,
    searchParams.to,
    searchQuery,
  );

  const [leads, total, counts] = await Promise.all([
    prisma.lead.findMany({
      where: whereClause,
      orderBy: { receivedAt: "desc" },
      skip,
      take: pageSize,
      include: {
        leadDeliveries: {
          include: { partner: true },
          orderBy: { deliveredAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.lead.count({ where: whereClause }),
    Promise.all(
      STATUS_TABS.map(async (tab) => ({
        value: tab.value,
        count: await prisma.lead.count({
          where: await buildWhere(tab.value === "all" ? undefined : tab.value),
        }),
      })),
    ),
  ]);

  const countMap = Object.fromEntries(counts.map((c) => [c.value, c.count]));

  const filterQs = new URLSearchParams();
  if (searchParams.state) filterQs.set("state", searchParams.state);
  if (searchParams.from) filterQs.set("from", searchParams.from);
  if (searchParams.to) filterQs.set("to", searchParams.to);
  const extraParams = filterQs.toString();

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle={
          searchQuery
            ? `Search results for “${searchQuery}”`
            : "All incoming IUL leads and their delivery status"
        }
        action={<LeadsExportButton status={statusFilter} />}
      />

      <div className="card">
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-4 py-2">
          {STATUS_TABS.map((tab) => {
            const base =
              tab.value === "all"
                ? "/admin/leads"
                : `/admin/leads?status=${tab.value}`;
            const href = extraParams ? `${base}${base.includes("?") ? "&" : "?"}${extraParams}` : base;
            return (
              <FilterTabLink
                key={tab.value}
                href={href}
                active={(statusFilter ?? "all") === tab.value}
                accent="orange"
              >
                {tab.label}
                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                  {countMap[tab.value] ?? 0}
                </span>
              </FilterTabLink>
            );
          })}
        </div>

        <Suspense fallback={null}>
          <AdminLeadsFilters />
        </Suspense>

        <div className="overflow-x-auto">
          {leads.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No leads found"
              description="Use the lead simulator to inject test leads into the platform."
              accent="orange"
              action={
                <PortalLink href="/dev/lead-simulator" className="btn-secondary btn-sm">
                  Open Simulator
                </PortalLink>
              }
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>State</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Partner</th>
                  <th>Price</th>
                  <th>Received</th>
                  <th>TrustedForm</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const delivery = lead.leadDeliveries[0];
                  return (
                    <ClickableRow key={lead.id} href={`/admin/leads/${lead.id}`}>
                      <td className="font-mono text-xs text-slate-400">
                        {lead.id.slice(0, 8)}…
                      </td>
                      <td>
                        <p className="font-medium text-slate-900">
                          {lead.firstName} {lead.lastName}
                        </p>
                        <p className="text-xs text-slate-400">{lead.email}</p>
                      </td>
                      <td className="text-slate-500">{lead.phone}</td>
                      <td>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">
                          {lead.state}
                        </span>
                      </td>
                      <td>
                        <Badge variant="purple">
                          {lead.leadType === "traditional_iul" ? "Trad. IUL" : "High Intent"}
                        </Badge>
                      </td>
                      <td>
                        <LeadStatusBadge status={lead.status} />
                      </td>
                      <td className="text-slate-600">
                        {delivery
                          ? `${delivery.partner.firstName} ${delivery.partner.lastName}`
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="font-semibold text-slate-700">
                        {delivery
                          ? `$${Number(delivery.price).toFixed(2)}`
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="text-slate-400 text-xs" suppressHydrationWarning>
                        {formatDateTime(lead.receivedAt)}
                      </td>
                      <td>
                        {lead.trustedformCertUrl ? (
                          <a
                            href={lead.trustedformCertUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-orange-600 hover:underline"
                          >
                            View cert
                          </a>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td>
                        <div className="flex justify-end">
                          {lead.status === "unmatched" && lead.available && (
                            <LeadReprocessButton leadId={lead.id} />
                          )}
                        </div>
                      </td>
                    </ClickableRow>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          basePath="/admin/leads"
          searchParams={searchParams}
        />
      </div>
    </div>
  );
}

function LeadStatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "green" | "yellow" | "red" | "blue" | "slate"; label: string }> = {
    delivered: { variant: "green", label: "Delivered" },
    unmatched: { variant: "yellow", label: "Unmatched" },
    integrity_posted: { variant: "blue", label: "Integrity" },
    aged_listed: { variant: "slate", label: "Aged" },
    dead: { variant: "red", label: "Dead" },
  };
  const c = config[status] ?? { variant: "slate" as const, label: status };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
