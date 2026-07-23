"use client";

import { useSearchParams } from "next/navigation";
import { useNavigateWithPending } from "@/hooks/use-navigate-with-pending";
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { usePartner } from "@/components/partner/partner-provider";
import { ShoppingBag, Funnel, Clock } from "@/lib/icons/client";
import { TablePagination } from "@/components/ui/table-pagination";
import { formatUsd, moneyCellClass, moneyHeaderClassName } from "@/lib/format-money";
import { US_STATE_CODES } from "@/lib/constants/us-states";

const agedActionColumnClassName = "w-28 min-w-28 text-right";

type AgedLead = {
  id: string;
  firstName: string;
  lastName: string;
  state: string;
  address: string | null;
  leadType: string;
  receivedAt: string;
  intent: string;
  haveIul: string | null;
  primaryGoal: string | null;
};

export function PartnerAgedView({
  agedLeads,
  agedPrice,
  total,
  page,
  pageSize,
  paginationParams,
}: {
  agedLeads: AgedLead[];
  agedPrice: number;
  total: number;
  page: number;
  pageSize: number;
  paginationParams: Record<string, string | undefined>;
}) {
  const { partner } = usePartner();
  const { push, router } = useNavigateWithPending();
  const urlSearchParams = useSearchParams();
  const canBuy = partner.status === "active" && partner.walletBalance >= agedPrice;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);

  const stateFilter = urlSearchParams.get("state") ?? "";
  const typeFilter = urlSearchParams.get("type") ?? "";
  const ageFilter = urlSearchParams.get("age") ?? "";

  function getAgeDays(receivedAt: string) {
    return Math.floor((Date.now() - new Date(receivedAt).getTime()) / (1000 * 60 * 60 * 24));
  }

  function updateFilter(key: "state" | "type" | "age", value: string) {
    const params = new URLSearchParams();
    const state = key === "state" ? value : stateFilter;
    const type = key === "type" ? value : typeFilter;
    const age = key === "age" ? value : ageFilter;
    if (state) params.set("state", state);
    if (type) params.set("type", type);
    if (age) params.set("age", age);
    const qs = params.toString();
    push(qs ? `/partner/aged?${qs}` : "/partner/aged");
  }

  function toggleLead(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === agedLeads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(agedLeads.map((l) => l.id)));
    }
  }

  async function purchase(leadIds: string[]) {
    if (!canBuy || leadIds.length === 0) return;
    setPending(true);
    try {
      const res = await fetch("/api/leads/aged/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds }),
      });
      if (!res.ok) throw new Error("Purchase failed");
      setSelected(new Set());
      router.refresh();
    } catch {
      // allow retry
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Aged Lead Marketplace"
        subtitle={`Browse leads 30+ days old — only ${formatUsd(agedPrice)} each`}
      />


      <div className="mb-5 card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Funnel size={13} />
            Filters:
          </div>
          <select
            value={stateFilter}
            onChange={(e) => updateFilter("state", e.target.value)}
            className="form-select w-40 py-1.5 text-xs"
          >
            <option value="">All States</option>
            {US_STATE_CODES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => updateFilter("type", e.target.value)}
            className="form-select w-44 py-1.5 text-xs"
          >
            <option value="">All Types</option>
            <option value="traditional_iul">Traditional IUL</option>
            <option value="high_intent_iul">High Intent IUL</option>
          </select>
          <select
            value={ageFilter}
            onChange={(e) => updateFilter("age", e.target.value)}
            className="form-select w-36 py-1.5 text-xs"
          >
            <option value="">Any Age</option>
            <option value="30">30–60 days</option>
            <option value="60">60–90 days</option>
            <option value="90">90+ days</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Available Aged Leads</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {agedLeads.length}
            </span>
          </div>
          {selected.size > 0 && canBuy && (
            <button
              type="button"
              disabled={pending}
              onClick={() => purchase(Array.from(selected))}
              className="btn-primary btn-sm"
            >
              {pending
                ? "Purchasing…"
                : `Buy Selected (${selected.size}) — ${formatUsd(selected.size * agedPrice)}`}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          {agedLeads.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No aged leads available"
              accent="teal"
              description="No aged leads match your filters right now. Check back later."
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-8">
                    <input
                      type="checkbox"
                      checked={selected.size === agedLeads.length && agedLeads.length > 0}
                      onChange={toggleAll}
                      className="rounded border-slate-300"
                    />
                  </th>
                  <th>Lead</th>
                  <th>State</th>
                  <th>Type</th>
                  <th>Have IUL</th>
                  <th>Intent</th>
                  <th>Age</th>
                  <th className={moneyHeaderClassName}>Price</th>
                  <th className={agedActionColumnClassName}>Action</th>
                </tr>
              </thead>
              <tbody>
                {agedLeads.map((lead) => {
                  const ageDays = getAgeDays(lead.receivedAt);
                  return (
                    <tr key={lead.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(lead.id)}
                          onChange={() => toggleLead(lead.id)}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td>
                        <p className="font-medium text-slate-900">
                          {lead.firstName} {lead.lastName}
                        </p>
                        {lead.address && (
                          <p className="text-xs text-slate-400">{lead.address}</p>
                        )}
                        {lead.primaryGoal && (
                          <p className="text-xs text-slate-400">{lead.primaryGoal}</p>
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
                      <td className="text-xs text-slate-600">
                        {lead.haveIul ?? "—"}
                      </td>
                      <td>
                        {lead.intent ? (
                          <Badge variant={lead.leadType === "high_intent_iul" ? "green" : "yellow"}>
                            {lead.intent}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Clock size={11} className="text-slate-400" />
                          <span className="font-medium">{ageDays}d</span>
                        </div>
                      </td>
                      <td className={moneyCellClass("font-bold text-slate-900")}>{formatUsd(agedPrice)}</td>
                      <td className={agedActionColumnClassName}>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={!canBuy || pending}
                            onClick={() => purchase([lead.id])}
                            className={`btn-sm rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                              canBuy
                                ? "bg-brand-700 text-white hover:bg-brand-800"
                                : "bg-slate-100 text-slate-400 cursor-not-allowed"
                            }`}
                          >
                            Buy
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
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          basePath="/partner/aged"
          searchParams={paginationParams}
        />
      </div>
    </div>
  );
}
