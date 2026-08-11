"use client";

import { useNavigateWithPending } from "@/hooks/use-navigate-with-pending";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { LeadCategoryBadge } from "@/components/leads/lead-category-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { usePartner } from "@/components/partner/partner-provider";
import { ShoppingBag, Funnel, Clock, X, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { ClientTablePagination } from "@/components/ui/table-pagination";
import { formatUsd } from "@/lib/format-money";
import { US_STATE_CODES } from "@/lib/constants/us-states";
import { FilterSelectDropdown } from "@/components/admin/filter-select-dropdown";
import {
  ADMIN_AGED_AGE_FILTER_OPTIONS,
  ADMIN_AGED_TYPE_FILTER_OPTIONS,
  filterPartnerAgedLeadsInMemory,
  partnerAgedLeadAgeDays,
  type PartnerAgedClientFilters,
} from "@/lib/admin/admin-aged-leads-filters";
import { DEFAULT_AGED_PRICE_TIERS, type AgedPriceTier } from "@/lib/aged/price-tiers";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import {
  AgedLeadPreviewSheet,
  type PartnerAgedLeadPreview,
} from "@/components/partner/aged-lead-preview-sheet";
import {
  AgedPurchaseSuccessModal,
  type AgedPurchaseSuccessLead,
} from "@/components/partner/aged-purchase-success-modal";
import { getPartnerAgedLeadAgeChipClassNames } from "@/lib/partner/aged-lead-age-chip";
import { ClientStoreKeys, useClientResource } from "@/lib/client-store";
import { notify } from "@/lib/notify";

type AgedLead = PartnerAgedLeadPreview;

type AgedFilters = PartnerAgedClientFilters;

type PartnerAgedStorePayload = {
  leads: AgedLead[];
  agedDays: number;
  fromPrice: number;
  totalEligible: number;
  loadCapped: boolean;
};

const partnerAgedStateOptions = US_STATE_CODES.map((code) => ({
  value: code,
  label: code,
}));

function syncAgedFiltersToUrl(filters: AgedFilters) {
  const params = new URLSearchParams();
  if (filters.states.length > 0) {
    params.set("state", filters.states.join(","));
  }
  if (filters.types.length > 0) {
    params.set("type", filters.types.join(","));
  }
  if (filters.ages.length > 0) {
    params.set("age", filters.ages.join(","));
  }
  const qs = params.toString();
  const next = qs ? `/partner/aged?${qs}` : "/partner/aged";
  window.history.replaceState(null, "", next);
}

const agedSubtitleEmphasisClassName = "font-semibold text-slate-700";

export function PartnerAgedView({
  allAgedLeads: initialLeads,
  agedDays,
  fromPrice,
  totalEligible,
  loadCapped,
  initialFilters,
  typeFilterOptions = ADMIN_AGED_TYPE_FILTER_OPTIONS,
  ageFilterOptions = ADMIN_AGED_AGE_FILTER_OPTIONS,
  priceTiers = DEFAULT_AGED_PRICE_TIERS,
}: {
  allAgedLeads: AgedLead[];
  agedDays: number;
  fromPrice: number;
  totalEligible: number;
  loadCapped: boolean;
  initialFilters: AgedFilters;
  typeFilterOptions?: { value: string; label: string }[];
  ageFilterOptions?: { value: string; label: string }[];
  priceTiers?: AgedPriceTier[];
}) {
  const { partner } = usePartner();
  const { router, push } = useNavigateWithPending();
  const isActive = partner.status === "active";

  const typeMultiOptions = useMemo(
    () => typeFilterOptions.filter((option) => option.value !== "all"),
    [typeFilterOptions],
  );
  const ageMultiOptions = useMemo(
    () => ageFilterOptions.filter((option) => option.value !== "all"),
    [ageFilterOptions],
  );

  const initialPayload: PartnerAgedStorePayload = useMemo(
    () => ({
      leads: initialLeads,
      agedDays,
      fromPrice,
      totalEligible,
      loadCapped,
    }),
    [initialLeads, agedDays, fromPrice, totalEligible, loadCapped],
  );

  const { data: cached, mutate } = useClientResource<PartnerAgedStorePayload>(
    ClientStoreKeys.partnerAged,
    { initialData: initialPayload },
  );

  const leads = cached?.leads ?? initialLeads;
  const effectiveLoadCapped = cached?.loadCapped ?? loadCapped;
  const effectiveTotalEligible = cached?.totalEligible ?? totalEligible;
  const [filters, setFilters] = useState<AgedFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [previewLead, setPreviewLead] = useState<AgedLead | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<{
    leads: AgedPurchaseSuccessLead[];
    totalCount: number;
  } | null>(null);

  function openPreview(lead: AgedLead) {
    setPreviewLead(lead);
    setPreviewOpen(true);
  }

  const filteredLeads = useMemo(
    () => filterPartnerAgedLeadsInMemory(leads, filters, priceTiers),
    [leads, filters, priceTiers],
  );

  const pageSize = DEFAULT_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const visibleLeads = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, safePage, pageSize]);

  const leadPriceById = useMemo(() => {
    const map = new Map<string, number>();
    for (const lead of leads) map.set(lead.id, lead.price);
    return map;
  }, [leads]);

  const selectedTotal = useMemo(() => {
    let sum = 0;
    for (const id of selected) sum += leadPriceById.get(id) ?? 0;
    return sum;
  }, [selected, leadPriceById]);

  const canBuySelected =
    isActive && selected.size > 0 && partner.walletBalance >= selectedTotal;

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

  const hasActiveFilters =
    filters.states.length > 0 ||
    filters.types.length > 0 ||
    filters.ages.length > 0;

  function clearFilters() {
    const next: AgedFilters = { states: [], types: [], ages: [] };
    setFilters(next);
    syncAgedFiltersToUrl(next);
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
    if (!isActive || leadIds.length === 0) return;
    const total = leadIds.reduce(
      (sum, id) => sum + (leadPriceById.get(id) ?? 0),
      0,
    );
    if (partner.walletBalance < total) {
      notify.error("Insufficient wallet balance for this selection.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/leads/aged/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds }),
      });
      if (!res.ok) throw new Error("Purchase failed");
      const data: {
        purchased: Array<{ leadId: string; firstName: string; lastName: string }>;
        failed: Array<{ leadId: string; reason: string }>;
      } = await res.json();
      const purchased = new Set(leadIds);
      mutate((prev) => {
        const base = prev ?? initialPayload;
        return {
          ...base,
          leads: base.leads.filter((l) => !purchased.has(l.id)),
          totalEligible: Math.max(0, base.totalEligible - leadIds.length),
        };
      });
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of leadIds) next.delete(id);
        return next;
      });
      router.refresh();

      if (data.purchased.length > 0) {
        setPurchaseSuccess({
          leads: data.purchased.map((p) => ({
            leadId: p.leadId,
            firstName: p.firstName,
            lastName: p.lastName,
          })),
          totalCount: data.purchased.length,
        });
      }
      if (data.failed.length > 0) {
        notify.error(
          data.failed.length === 1
            ? `1 lead could not be purchased: ${data.failed[0].reason}`
            : `${data.failed.length} leads could not be purchased.`,
        );
      }
    } catch {
      notify.error("Purchase failed — please try again.");
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
        subtitle={
          <>
            Browse leads{" "}
            <span className={agedSubtitleEmphasisClassName}>{agedDays}+</span> days old — from{" "}
            <span className={agedSubtitleEmphasisClassName}>{formatUsd(fromPrice)}</span>
          </>
        }
      />

      {effectiveLoadCapped && (
        <p className="mb-4 text-xs text-amber-700">
          Showing the first {leads.length.toLocaleString()} of{" "}
          {effectiveTotalEligible.toLocaleString()} eligible leads. Narrow filters or contact support if
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
            selectionMode="multi"
            value={filters.types}
            allValue="all"
            options={typeMultiOptions}
            onChange={(types) => updateFilter("types", types)}
            searchable={false}
          />
          <FilterSelectDropdown
            id="partner-aged-filter-age"
            dimensionLabel="Age"
            accent="teal"
            selectionMode="multi"
            value={filters.ages}
            allValue="all"
            options={ageMultiOptions}
            onChange={(ages) => updateFilter("ages", ages)}
            searchable={false}
          />
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto inline-flex items-center gap-1 rounded-sm text-xs text-slate-400 transition-colors hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            >
              <X size={12} weight={ICON_WEIGHT_LINEAR} aria-hidden />
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            {filteredLeads.length > 0 && (
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleAll}
                className="rounded border-slate-300"
                aria-label="Select all leads on this page"
              />
            )}
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Available Aged Leads</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {filteredLeads.length}
              </span>
            </div>
          </div>
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setSelected(new Set())}
                className="btn-secondary btn-sm"
              >
                Clear selection
              </button>
              {canBuySelected && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => purchase(Array.from(selected))}
                  className="btn-primary btn-sm"
                >
                  {pending
                    ? "Purchasing…"
                    : `Buy — ${formatUsd(selectedTotal)}`}
                </button>
              )}
            </div>
          )}
        </div>

        {filteredLeads.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No aged leads available"
            accent="teal"
            description="No aged leads match your filters right now. Check back later."
          />
        ) : (
          <ul className="divide-y divide-slate-100" aria-label="Available aged leads">
            {visibleLeads.map((lead) => {
              const ageDays = partnerAgedLeadAgeDays(lead.receivedAt);
              const ageChip = getPartnerAgedLeadAgeChipClassNames(ageDays, agedDays);
              const leadName = `${lead.firstName} ${lead.lastName}`;
              const canBuyLead =
                isActive && partner.walletBalance >= lead.price;

              function onRowKeyDown(e: React.KeyboardEvent) {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openPreview(lead);
                }
              }

              return (
                <li key={lead.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex cursor-pointer items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600"
                    onClick={() => openPreview(lead)}
                    onKeyDown={onRowKeyDown}
                    aria-label={`Preview ${leadName}`}
                  >
                    <div
                      className="flex shrink-0 items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(lead.id)}
                        onChange={() => toggleLead(lead.id)}
                        className="rounded border-slate-300"
                        aria-label={`Select ${leadName}`}
                      />
                    </div>

                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="min-w-0">
                        <span className="font-medium text-slate-900">{leadName}</span>
                        {lead.address && (
                          <p className="mt-0.5 text-xs text-slate-400">{lead.address}</p>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">
                          {lead.state}
                        </span>
                        <LeadCategoryBadge leadType={lead.leadType || null}>
                          {lead.leadTypeLabel}
                        </LeadCategoryBadge>
                        <span className={ageChip.chip}>
                          <Clock size={11} className={ageChip.icon} aria-hidden />
                          {ageDays}d
                        </span>
                        <span className="rounded bg-teal-50 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-teal-800">
                          {formatUsd(lead.price)}
                        </span>
                      </div>
                    </div>

                    <div
                      className="shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        disabled={!canBuyLead || pending}
                        onClick={() => purchase([lead.id])}
                        className={`btn-sm rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          canBuyLead
                            ? "bg-brand-700 text-white hover:bg-brand-800"
                            : "cursor-not-allowed bg-slate-100 text-slate-400"
                        }`}
                      >
                        Buy
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <ClientTablePagination
          page={safePage}
          pageSize={pageSize}
          total={filteredLeads.length}
          onPageChange={setPage}
        />
      </div>

      <AgedLeadPreviewSheet
        lead={previewLead}
        agedDays={agedDays}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />

      <AgedPurchaseSuccessModal
        open={purchaseSuccess !== null}
        onOpenChange={(open) => {
          if (!open) setPurchaseSuccess(null);
        }}
        leads={purchaseSuccess?.leads ?? []}
        totalCount={purchaseSuccess?.totalCount ?? 0}
        onViewLeads={() => {
          setPurchaseSuccess(null);
          push("/partner/leads");
        }}
      />
    </div>
  );
}
