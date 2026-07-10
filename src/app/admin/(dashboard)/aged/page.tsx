import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Archive } from "lucide-react";
import Link from "next/link";
import { buildAgedLeadWhere } from "@/lib/aged/eligibility";
import { getDefaultAgedPrice } from "@/lib/settings/app-settings";

export default async function AdminAgedPage() {
  const agedWhere = await buildAgedLeadWhere();
  const [leads, agedPrice, stateCounts, agedDays] = await Promise.all([
    prisma.lead.findMany({
      where: agedWhere,
      orderBy: { receivedAt: "asc" },
      take: 100,
    }),
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

  return (
    <div>
      <PageHeader
        title="Aged Leads"
        subtitle={`Leads ${agedDays}+ days old — default price $${agedPrice}`}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Available</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{leads.length}</p>
        </div>
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
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>State</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Age (days)</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const ageDays = Math.floor(
                    (Date.now() - lead.receivedAt.getTime()) / (1000 * 60 * 60 * 24),
                  );
                  return (
                    <tr key={lead.id}>
                      <td>
                        <Link href={`/admin/leads/${lead.id}`} className="font-medium hover:text-brand-600">
                          {lead.firstName} {lead.lastName}
                        </Link>
                      </td>
                      <td>{lead.state}</td>
                      <td>
                        <Badge variant="blue">
                          {lead.leadType === "traditional_iul" ? "Trad. IUL" : "High Intent"}
                        </Badge>
                      </td>
                      <td className="capitalize">{lead.status.replace("_", " ")}</td>
                      <td>{ageDays}d</td>
                      <td className="font-semibold">${agedPrice.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
