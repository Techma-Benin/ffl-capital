"use client";

import { useNavigateWithPending } from "@/hooks/use-navigate-with-pending";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { usePartner } from "@/components/partner/partner-provider";
import { ShoppingBag, Funnel, Clock } from "@/lib/icons/client";
import { ClientTablePagination } from "@/components/ui/table-pagination";
import { formatUsd, moneyCellClass, moneyHeaderClassName } from "@/lib/format-money";
import { US_STATE_CODES } from "@/lib/constants/us-states";
import { FilterSelectDropdown } from "@/components/admin/filter-select-dropdown";
import {
  ADMIN_AGED_AGE_FILTER_OPTIONS,
  ADMIN_AGED_TYPE_FILTER_OPTIONS,
  filterPartnerAgedLeadsInMemory,
  partnerAgedLeadAgeDays,
  type AdminAgedLeadAgeFilterValue,
  type AdminAgedLeadTypeFilter,
  type PartnerAgedClientFilters,
} from "@/lib/admin/admin-aged-leads-filters";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import {
  AgedLeadPreviewSheet,
  type PartnerAgedLeadPreview,
} from "@/components/partner/aged-lead-preview-sheet";

const agedPriceColumnWidth = "w-24 min-w-24 whitespace-nowrap";
const agedPriceHeaderClassName = `${moneyHeaderClassName} ${agedPriceColumnWidth}`;
const agedActionColumnClassName = "w-36 min-w-36 text-center";

type AgedLead = PartnerAgedLeadPreview;

type AgedFilters = PartnerAgedClientFilters;

const partnerAgedStateOptions = US_STATE_CODES.map((code) => ({
  value: code,
  label: code,
}));

function syncAgedFiltersToUrl(filters: AgedFilters) {
  const params = new URLSearchParams();
  if (filters.states.length > 0) {
    params.set("state", filters.states.join(","));
  }
  if (filters.type) params.set("type", filters.type);
  if (filters.age) params.set("age", filters.age);
  const qs = params.toString();
  const next = qs ? `/partner/aged?${qs}` : "/partner/aged";
  window.history.replaceState(null, "", next);
}

export function PartnerAgedView({
  allAgedLeads: initialLeads,
  agedPrice,
  totalEligible,
  loadCapped,
  initialFilters,
}: {
  allAgedLeads: AgedLead[];
  agedPrice: number;
  totalEligible: number;
  loadCapped: boolean;
  initialFilters: AgedFilters;
}) {
  const { partner } = usePartner();
  const { router } = useNavigateWithPending();
  const canBuy = partner.status === "active" && partner.walletBalance >= agedPrice;

  const [leads, setLeads] = useState(initialLeads);
  const [filters, setFilters] = useState<AgedFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [previewLead, setPreviewLead] = useState<AgedLead | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  function openPreview(lead: AgedLead) {
    setPreviewLead(lead);
    setPreviewOpen(true);
  }

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  const filteredLeads = useMemo(
    () => filterPartnerAgedLeadsInMemory(leads, filters),
    [leads, filters],
  );

  const pageSize = DEFAULT_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const visibleLeads = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, safePage, pageSize]);

  function updateFilter<K extends keyof AgedFilters>(
    key: K,
    value: AgedFilters[K],
  ) {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      syncAgedFiltersToUrl(next);
      return next;
    });
    setPage(1);
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
    const visibleIds = visibleLeads.map((l) => l.id);
    const allVisibleSelected = visibleIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
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
      const purchased = new Set(leadIds);
      setLeads((prev) => prev.filter((l) => !purchased.has(l.id)));
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of leadIds) next.delete(id);
        return next;
      });
      router.refresh();
    } catch {
      // allow retry
    } finally {
      setPending(false);
    }
  }

  const allVisibleSelected =
    visibleLeads.length > 0 && visibleLeads.every((l) => selected.has(l.id));

  return (
    <div>
      <PageHeader
        title="Aged Lead Marketplace"
        subtitle={`Browse leads 30+ days old — only ${formatUsd(agedPrice)} each`}
      />

      {loadCapped && (
        <p className="mb-4 text-xs text-amber-700">
          Showing the first {leads.length.toLocaleString()} of{" "}
          {totalEligible.toLocaleString()} eligible leads. Narrow filters or contact support if
          you need the full catalog.
        </p>
      )}

      <div className="mb-5 card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Funnel size={13} />
            Filters:
          </div>
          <FilterSelectDropdown
            id="partner-aged-filter-state"
            dimensionLabel="State"
            accent="teal"
            selectionMode="multi"
            value={filters.states}
            allValue="all"
            options={partnerAgedStateOptions}
            onChange={(states) => updateFilter("states", states)}
            menuWidthClass="w-64"
            searchable
          />
          <FilterSelectDropdown
            id="partner-aged-filter-type"
            dimensionLabel="Type"
            accent="teal"
            value={(filters.type || "all") as AdminAgedLeadTypeFilter}
            allValue="all"
            options={ADMIN_AGED_TYPE_FILTER_OPTIONS}
            onChange={(type) =>
              updateFilter("type", type === "all" ? "" : type)
            }
            searchable={false}
          />
          <FilterSelectDropdown
            id="partner-aged-filter-age"
            dimensionLabel="Age"
            accent="teal"
            value={(filters.age || "all") as AdminAgedLeadAgeFilterValue}
            allValue="all"
            options={ADMIN_AGED_AGE_FILTER_OPTIONS}
            onChange={(age) => updateFilter("age", age === "all" ? "" : age)}
            searchable={false}
          />
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Available Aged Leads</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {filteredLeads.length}
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
          {filteredLeads.length === 0 ? (
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
                      checked={allVisibleSelected}
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
                  <th className={agedPriceHeaderClassName}>Price</th>
                  <th className={agedActionColumnClassName}>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleLeads.map((lead) => {
                  const ageDays = partnerAgedLeadAgeDays(lead.receivedAt);
                  return (
                    <tr
                      key={lead.id}
                      className="cursor-pointer"
                      onClick={() => openPreview(lead)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
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
                      <td className="text-xs text-slate-600">{lead.haveIul ?? "—"}</td>
                      <td>
                        {lead.intent ? (
                          <Badge
                            variant={lead.leadType === "high_intent_iul" ? "green" : "yellow"}
                          >
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
                      <td
                        className={moneyCellClass(agedPriceColumnWidth, "font-bold text-slate-900")}
                      >
                        {formatUsd(agedPrice)}
                      </td>
                      <td
                        className={agedActionColumnClassName}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-center">
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
        <ClientTablePagination
          page={safePage}
          pageSize={pageSize}
          total={filteredLeads.length}
          onPageChange={setPage}
        />
      </div>

      <AgedLeadPreviewSheet
        lead={previewLead}
        agedPrice={agedPrice}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}
