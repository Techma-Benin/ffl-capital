import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Users, CheckCircle, XCircle, MapPin } from "lucide-react";
import Link from "next/link";

export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const statusFilter = searchParams.status;

  const partners = await prisma.partner.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    ...(statusFilter ? { where: { status: statusFilter as never } } : {}),
  });

  const pendingCount = partners.filter(p => p.status === "pending_approval").length;
  const activeCount  = partners.filter(p => p.status === "active").length;

  const statusTabs = [
    { label: "All Partners", value: undefined, count: partners.length },
    { label: "Pending",      value: "pending_approval", count: pendingCount },
    { label: "Active",       value: "active",            count: activeCount },
  ];

  return (
    <div>
      <PageHeader
        title="Partners"
        subtitle="Manage lead buyers and their accounts"
      />

      {/* Summary cards */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total Partners", value: partners.length, color: "text-brand-600" },
          { label: "Active",         value: activeCount,     color: "text-emerald-600" },
          { label: "Pending",        value: pendingCount,    color: "text-amber-600" },
        ].map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{c.label}</p>
            <p className={`mt-1 text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="card">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 border-b border-slate-100 px-4 py-2">
          {statusTabs.map((tab) => (
            <Link
              key={tab.label}
              href={tab.value ? `/admin/partners?status=${tab.value}` : "/admin/partners"}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === tab.value || (!statusFilter && !tab.value)
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                {tab.count}
              </span>
            </Link>
          ))}
        </div>

        <div className="overflow-x-auto">
          {partners.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No partners yet"
              description="Partners will appear here once they sign up and complete onboarding."
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Partner</th>
                  <th>Affiliation</th>
                  <th>Lead Type</th>
                  <th>States</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Wallet</th>
                  <th>Lead Buying</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => {
                  const isActive = p.status === "active";
                  const walletOk = Number(p.walletBalance) >= 25;
                  const statesOk = p.filterStates.length >= 15;
                  const leadBuying = isActive && walletOk && statesOk;

                  return (
                    <tr key={p.id}>
                      <td>
                        <div>
                          <p className="font-medium text-slate-900">
                            {p.firstName} {p.lastName}
                          </p>
                          <p className="text-xs text-slate-400">{p.email}</p>
                        </div>
                      </td>
                      <td className="text-slate-500">{p.affiliation ?? "—"}</td>
                      <td>
                        <Badge variant="blue">
                          {p.leadType === "traditional_iul" ? "Trad. IUL" : "High Intent"}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400" />
                          <span className={`text-sm font-medium ${statesOk ? "text-slate-700" : "text-red-500"}`}>
                            {p.filterStates.length}
                            {!statesOk && " (min 15)"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <PartnerStatusBadge status={p.status} />
                      </td>
                      <td>
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                          {p.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`font-semibold ${walletOk ? "text-slate-900" : "text-red-500"}`}>
                          ${Number(p.walletBalance).toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <Badge variant={leadBuying ? "green" : "slate"}>
                          {leadBuying ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          {p.status === "pending_approval" && (
                            <>
                              <form action={`/api/admin/partners/approve`} method="POST">
                                <input type="hidden" name="partnerId" value={p.id} />
                                <input type="hidden" name="action" value="approve" />
                                <button
                                  type="submit"
                                  className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                                >
                                  <CheckCircle size={12} />
                                  Approve
                                </button>
                              </form>
                              <form action={`/api/admin/partners/approve`} method="POST">
                                <input type="hidden" name="partnerId" value={p.id} />
                                <input type="hidden" name="action" value="reject" />
                                <button
                                  type="submit"
                                  className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                                >
                                  <XCircle size={12} />
                                  Reject
                                </button>
                              </form>
                            </>
                          )}
                          {p.status === "active" && (
                            <span className="text-xs text-slate-300 italic">—</span>
                          )}
                        </div>
                      </td>
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

function PartnerStatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: "green" | "yellow" | "red" | "slate"; label: string }> = {
    active:           { variant: "green",  label: "Active" },
    pending_approval: { variant: "yellow", label: "Pending" },
    rejected:         { variant: "red",    label: "Rejected" },
    disabled:         { variant: "slate",  label: "Disabled" },
  };
  const c = map[status] ?? { variant: "slate" as const, label: status };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
