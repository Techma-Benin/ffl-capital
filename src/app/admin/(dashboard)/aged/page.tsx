import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Archive } from "@/lib/icons/ssr";
import { buildAgedLeadWhere } from "@/lib/aged/eligibility";
import { getDefaultAgedPrice } from "@/lib/settings/app-settings";
import { StatCard } from "@/components/ui/stat-card";
import { TablePagination } from "@/components/ui/table-pagination";
import { parsePageParams } from "@/lib/pagination";
import { formatUsd } from "@/lib/format-money";
import { AdminAgedLeadsTable } from "@/components/admin/admin-aged-leads-table";
import {
  buildAdminAgedLeadOrderBy,
  parseAdminAgedLeadSort,
  sortHrefMap,
} from "@/lib/admin/admin-aged-leads-sort";

const BASE_PATH = "/admin/aged";

export default async function AdminAgedPage({
  searchParams,
}: {
  searchParams: { page?: string; sort?: string; dir?: string };
}) {
  const agedWhere = await buildAgedLeadWhere();
  const { page, pageSize, skip } = parsePageParams(searchParams);
  const { sort, dir } = parseAdminAgedLeadSort(searchParams);
  const orderBy = buildAdminAgedLeadOrderBy(sort, dir);
  const hrefBySortKey = sortHrefMap(BASE_PATH, searchParams);

  const [leads, total, agedPrice, stateCounts, agedDays] = await Promise.all([
    prisma.lead.findMany({
      where: agedWhere,
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.lead.count({ where: agedWhere }),
    getDefaultAgedPrice(),
    prisma.lead.groupBy({
      by: ["state"],
      where: agedWhere,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
    import("@/lib/settings/app-settings").then((m) => m.getAgedDaysThreshold()),
  ]);

  const rows = leads.map((lead) => ({
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    state: lead.state,
    leadType: lead.leadType,
    status: lead.status,
    ageDays: Math.floor(
      (Date.now() - lead.receivedAt.getTime()) / (1000 * 60 * 60 * 24),
    ),
  }));

  return (
    <div>
      <PageHeader
        title="Aged Leads"
        subtitle={`Leads ${agedDays}+ days old — default price ${formatUsd(agedPrice)}`}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Available"
          value={total}
          icon={Archive}
          accent="blue"
          blobIndex={0}
        />
        <div className="card p-4 sm:col-span-2">
          <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Top states</p>
          <div className="flex flex-wrap gap-2">
            {stateCounts.map((s) => (
              <span key={s.state} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium">
                {s.state}: {s._count.id}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          {leads.length === 0 ? (
            <EmptyState
              icon={Archive}
              title="No aged leads"
              description="Leads become eligible 30 days after receipt."
              accent="teal"
            />
          ) : (
            <AdminAgedLeadsTable
              leads={rows}
              agedPrice={agedPrice}
              sort={sort}
              dir={dir}
              hrefBySortKey={hrefBySortKey}
            />
          )}
        </div>
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          basePath={BASE_PATH}
          searchParams={searchParams}
        />
      </div>
    </div>
  );
}
