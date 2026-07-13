import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { PartnerEditForm } from "@/components/admin/partner-edit-form";
import { ArrowLeft } from "lucide-react";

export default async function AdminPartnerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const partner = await prisma.partner.findUnique({
    where: { id: params.id },
    include: {
      filterSets: { orderBy: { createdAt: "asc" } },
      transactions: { orderBy: { createdAt: "desc" }, take: 15 },
      leadDeliveries: {
        orderBy: { deliveredAt: "desc" },
        take: 10,
        include: { lead: true },
      },
    },
  });

  if (!partner) notFound();

  return (
    <div>
      <PageHeader
        title={`${partner.firstName} ${partner.lastName}`}
        subtitle={partner.email}
        action={
          <Link href="/admin/partners" className="btn-secondary btn-sm inline-flex items-center gap-1">
            <ArrowLeft size={14} />
            Back
          </Link>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {[
          { label: "Status", value: partner.status },
          { label: "Wallet", value: `$${Number(partner.walletBalance).toFixed(2)}` },
          { label: "States", value: partner.filterStates.length },
          { label: "Priority", value: partner.priority },
        ].map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{c.label}</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>

      <PartnerEditForm
        partnerId={partner.id}
        initial={{
          priority: partner.priority,
          priceOverride: partner.priceOverride ? Number(partner.priceOverride) : null,
          status: partner.status,
        }}
      />

      <div className="mt-6 card">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Filter Sets</h2>
        </div>
        <div className="overflow-x-auto">
          {partner.filterSets.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-400">No filter sets configured.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Lead Type</th>
                  <th>States</th>
                  <th>Priority</th>
                  <th>Price Override</th>
                  <th>Limits</th>
                  <th>Delivery</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {partner.filterSets.map((fs) => (
                  <tr key={fs.id}>
                    <td className="font-medium">{fs.name}</td>
                    <td>
                      <Badge variant="blue">
                        {fs.leadType === "traditional_iul" ? "Trad. IUL" : "High Intent"}
                      </Badge>
                    </td>
                    <td>{fs.filterStates.length}</td>
                    <td>{fs.priority}</td>
                    <td>
                      {fs.priceOverride
                        ? `$${Number(fs.priceOverride).toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="text-xs text-slate-500">
                      {fs.hourlyLimit ?? "∞"}/hr · {fs.dailyLimit ?? "∞"}/day
                    </td>
                    <td className="text-xs capitalize">{fs.deliveryChannel ?? "email"}</td>
                    <td>
                      <Badge variant={fs.active ? "green" : "slate"}>
                        {fs.active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="mt-6 card">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Recent Deliveries</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>State</th>
                <th>Channel</th>
                <th>Price</th>
                <th>Delivered</th>
              </tr>
            </thead>
            <tbody>
              {partner.leadDeliveries.map((d) => (
                <tr key={d.id}>
                  <td className="font-medium">
                    {d.lead.firstName} {d.lead.lastName}
                  </td>
                  <td>{d.lead.state}</td>
                  <td>
                    <Badge variant={d.channel === "realtime" ? "green" : "purple"}>
                      {d.channel}
                    </Badge>
                  </td>
                  <td>${Number(d.price).toFixed(2)}</td>
                  <td className="text-xs text-slate-400">
                    {new Date(d.deliveredAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 card">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Transaction History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>Balance After</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {partner.transactions.map((t) => (
                <tr key={t.id}>
                  <td>{t.type}</td>
                  <td className={Number(t.amount) > 0 ? "text-emerald-600" : ""}>
                    {Number(t.amount) > 0 ? "+" : ""}${Math.abs(Number(t.amount)).toFixed(2)}
                  </td>
                  <td>${Number(t.balanceAfter).toFixed(2)}</td>
                  <td className="text-xs text-slate-400">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
