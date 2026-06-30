import { getCurrentPartner } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ShoppingBag, Filter, Clock, ShieldCheck } from "lucide-react";

export default async function PartnerAgedPage() {
  const partner = await getCurrentPartner();
  if (!partner) return null;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const balance = Number(partner.walletBalance);
  const canBuy = partner.status === "active" && balance >= 5;

  const agedLeads = await prisma.lead.findMany({
    where: {
      receivedAt: { lte: thirtyDaysAgo },
      status:     { not: "dead" },
      state:      { in: partner.filterStates.length > 0 ? partner.filterStates : ["__none__"] },
    },
    orderBy: { receivedAt: "asc" },
    take: 100,
  });

  const agedPriceResult = await prisma.appSetting.findUnique({
    where: { key: "default_aged_price" },
  });
  const agedPrice = agedPriceResult
    ? Number((agedPriceResult.value as { value: number }).value)
    : 5;

  function getAgeDays(receivedAt: Date) {
    return Math.floor((Date.now() - receivedAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <div>
      <PageHeader
        title="Aged Lead Marketplace"
        subtitle={`Browse leads 30+ days old — only $${agedPrice} each`}
      />

      {/* Balance warning */}
      {!canBuy && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {partner.status !== "active" ? (
            <p>Your account must be <strong>active</strong> to purchase aged leads.</p>
          ) : (
            <p>Your wallet balance is too low. Minimum <strong>$5.00</strong> required. <a href="/partner/wallet" className="font-semibold text-brand-600 hover:underline">Add funds →</a></p>
          )}
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-5 card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Filter size={13} />
            Filters:
          </div>
          <select className="form-select w-40 py-1.5 text-xs">
            <option value="">All States</option>
            {partner.filterStates.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className="form-select w-44 py-1.5 text-xs">
            <option value="">All Types</option>
            <option value="traditional_iul">Traditional IUL</option>
            <option value="high_intent_iul">High Intent IUL</option>
          </select>
          <select className="form-select w-36 py-1.5 text-xs">
            <option value="">Any Age</option>
            <option value="30">30–60 days</option>
            <option value="60">60–90 days</option>
            <option value="90">90+ days</option>
          </select>
          <button className="btn-secondary btn-sm ml-auto">
            Apply
          </button>
        </div>
      </div>

      {/* Leads list */}
      <div className="card">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Available Aged Leads</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {agedLeads.length}
            </span>
          </div>
          {agedLeads.length > 0 && canBuy && (
            <button className="btn-primary btn-sm">
              Buy Selected ({`$${agedPrice}/each`})
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          {agedLeads.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No aged leads available"
              description={
                partner.filterStates.length === 0
                  ? "You have no target states selected. Set up your states in Settings to see leads."
                  : "No aged leads match your target states right now. Check back later."
              }
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-8">
                    <input type="checkbox" className="rounded border-slate-300" />
                  </th>
                  <th>Lead</th>
                  <th>State</th>
                  <th>Type</th>
                  <th>Age</th>
                  <th>Intent</th>
                  <th>TrustedForm</th>
                  <th>Price</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {agedLeads.map((lead) => {
                  const ageDays = getAgeDays(lead.receivedAt);
                  const rawPayload = lead.rawPayload as Record<string, string> | null;
                  const intent = rawPayload?.intent ?? rawPayload?.Intent ?? "—";
                  const primaryGoal = rawPayload?.primary_goal ?? rawPayload?.PrimaryGoal ?? null;

                  return (
                    <tr key={lead.id}>
                      <td>
                        <input type="checkbox" className="rounded border-slate-300" />
                      </td>
                      <td>
                        <p className="font-medium text-slate-900">
                          {lead.firstName} {lead.lastName}
                        </p>
                        {primaryGoal && (
                          <p className="text-xs text-slate-400">{primaryGoal}</p>
                        )}
                      </td>
                      <td>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">
                          {lead.state}
                        </span>
                      </td>
                      <td>
                        <Badge variant="blue">
                          {lead.leadType === "traditional_iul" ? "Trad. IUL" : "High Intent"}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Clock size={11} className="text-slate-400" />
                          <span className="font-medium">{ageDays}d</span>
                        </div>
                      </td>
                      <td>
                        {intent !== "—" ? (
                          <Badge variant={intent === "high" ? "green" : "yellow"}>
                            {intent}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td>
                        {lead.trustedformCertUrl ? (
                          <a
                            href={lead.trustedformCertUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                          >
                            <ShieldCheck size={11} />
                            View
                          </a>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="font-bold text-slate-900">${agedPrice.toFixed(2)}</td>
                      <td>
                        <div className="flex justify-end">
                          <button
                            className={`btn-sm rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                              canBuy
                                ? "bg-brand-700 text-white hover:bg-brand-800"
                                : "bg-slate-100 text-slate-400 cursor-not-allowed"
                            }`}
                            disabled={!canBuy}
                          >
                            Buy — ${agedPrice}
                          </button>
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
