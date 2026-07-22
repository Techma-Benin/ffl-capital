"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { usePartner } from "@/components/partner/partner-provider";
import { ShoppingBag, Funnel, Clock, ShieldCheck } from "@/lib/icons/client";
import { TablePagination } from "@/components/ui/table-pagination";
import { formatUsd } from "@/lib/format-money";

type AgedLead = {
  id: string;
  firstName: string;
  lastName: string;
  state: string;
  address: string | null;
  leadType: string;
  receivedAt: string;
  trustedformCertUrl: string | null;
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
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const canBuy = partner.status === "active" && partner.walletBalance >= agedPrice;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);

  const [stateFilter, setStateFilter] = useState(urlSearchParams.get("state") ?? "");
  const [typeFilter, setTypeFilter] = useState(urlSearchParams.get("type") ?? "");
  const [ageFilter, setAgeFilter] = useState(urlSearchParams.get("age") ?? "");

  function getAgeDays(receivedAt: string) {
    return Math.floor((Date.now() - new Date(receivedAt).getTime()) / (1000 * 60 * 60 * 24));
  }

  function applyFilters() {
    const params = new URLSearchParams();
    if (stateFilter) params.set("state", stateFilter);
    if (typeFilter) params.set("type", typeFilter);
    if (ageFilter) params.set("age", ageFilter);
    router.push(`/partner/aged?${params.toString()}`);
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
            onChange={(e) => setStateFilter(e.target.value)}
            className="form-select w-40 py-1.5 text-xs"
          >
            <option value="">All States</option>
            {partner.filterStates.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="form-select w-44 py-1.5 text-xs"
          >
            <option value="">All Types</option>
            <option value="traditional_iul">Traditional IUL</option>
            <option value="high_intent_iul">High Intent IUL</option>
          </select>
          <select
            value={ageFilter}
            onChange={(e) => setAgeFilter(e.target.value)}
            className="form-select w-36 py-1.5 text-xs"
          >
            <option value="">Any Age</option>
            <option value="30">30–60 days</option>
            <option value="60">60–90 days</option>
            <option value="90">90+ days</option>
          </select>
          <button type="button" onClick={applyFilters} className="btn-secondary btn-sm ml-auto">
            Apply
          </button>
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
              description={
                partner.filterStates.length === 0
                  ? "You have no target states selected. Set up your states in Settings to see leads."
                  : "No aged leads match your filters right now. Check back later."
              }
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
                  <th>Have IUL</th>
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
                      <td className="text-xs text-slate-600">
                        {lead.haveIul ?? "—"}
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
                        {lead.intent ? (
                          <Badge variant={lead.leadType === "high_intent_iul" ? "green" : "yellow"}>
                            {lead.intent}
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
                      <td className="font-bold text-slate-900">{formatUsd(agedPrice)}</td>
                      <td>
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
                            Buy — {formatUsd(agedPrice)}
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
