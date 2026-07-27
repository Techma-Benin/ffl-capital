"use client";

import { useCallback, useEffect, useMemo, useRef, useState, forwardRef } from "react";
import { useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Sheet, SheetBody } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusStrip } from "@/components/ui/status-strip";
import {
  Wallet,
  ArrowCounterClockwise,
  TrendUp,
  TrendDown,
  DownloadSimple,
  List,
  Funnel,
} from "@/lib/icons/client";
import { formatUsd } from "@/lib/format-money";
import {
  PortalSortableHeaderCell,
  type SortDirection,
} from "@/components/ui/portal-sortable-table-header";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TransactionRow = {
  id: string;
  createdAt: string;
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  type: string;
  description: string | null;
  leadId: string | null;
  leadName: string | null;
  amount: number;
  direction: "credit" | "debit";
  balanceAfter: number;
  paymentMethod: string;
  stripePaymentIntentId: string | null;
};

export type TransactionSummary = {
  funding: number;
  leadRevenue: number;
  refunds: number;
  net: number;
  count: number;
};

export type PartnerOption = {
  id: string;
  name: string;
  email: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TRANSACTION_TYPES = [
  { value: "top_up", label: "Top-up" },
  { value: "lead_purchase", label: "Lead Purchase" },
  { value: "aged_purchase", label: "Aged Purchase" },
  { value: "refund", label: "Refund" },
  { value: "reprocessing_fee", label: "Reprocessing Fee" },
];

const PAYMENT_METHODS = [
  { value: "all", label: "All Methods" },
  { value: "stripe", label: "Stripe" },
  { value: "manual", label: "Manual" },
  { value: "auto", label: "Auto-recharge" },
  { value: "wallet", label: "Wallet" },
];

// ─── Badge styles ─────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, string> = {
  top_up: "bg-blue-100 text-blue-800",
  lead_purchase: "bg-indigo-100 text-indigo-800",
  aged_purchase: "bg-teal-100 text-teal-800",
  refund: "bg-orange-100 text-orange-800",
  reprocessing_fee: "bg-slate-100 text-slate-700",
};

const TYPE_LABEL: Record<string, string> = {
  top_up: "Top-up",
  lead_purchase: "Lead Purchase",
  aged_purchase: "Aged Purchase",
  refund: "Refund",
  reprocessing_fee: "Reprocessing Fee",
};

const METHOD_LABEL: Record<string, string> = {
  stripe: "Stripe",
  manual: "Manual",
  auto: "Auto",
  wallet: "Wallet",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  );
}

function buildParams(filters: Record<string, string>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v && v !== "all") p.set(k, v);
  }
  return p;
}

// ─── Main component ───────────────────────────────────────────────────────────

type SortKey =
  | "date"
  | "partner"
  | "type"
  | "description"
  | "lead"
  | "direction"
  | "amount"
  | "method"
  | "balanceAfter";

export function AdminTransactionsView({
  initialRows,
  initialSummary,
  initialPagination,
  partners,
}: {
  initialRows: TransactionRow[];
  initialSummary: TransactionSummary;
  initialPagination: { page: number; pageSize: number; total: number; totalPages: number };
  partners: PartnerOption[];
}) {
  const searchParams = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  // Filter state
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [partnerId, setPartnerId] = useState(searchParams.get("partnerId") ?? "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") ?? "");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    searchParams.get("types") ? searchParams.get("types")!.split(",").filter(Boolean) : [],
  );
  const [direction, setDirection] = useState(searchParams.get("direction") ?? "all");
  const [paymentMethod, setPaymentMethod] = useState(
    searchParams.get("paymentMethod") ?? "all",
  );
  const [page, setPage] = useState(
    Math.max(1, Number(searchParams.get("page") ?? 1) || 1),
  );

  // Data state
  const [rows, setRows] = useState<TransactionRow[]>(initialRows);
  const [summary, setSummary] = useState<TransactionSummary>(initialSummary);
  const [totalPages, setTotalPages] = useState(initialPagination.totalPages);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const requestControllerRef = useRef<AbortController | null>(null);
  const initialFilteredFetchRef = useRef(false);

  const sortedRows = useMemo(() => {
    const multiplier = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      switch (sortKey) {
        case "date":
          aVal = a.createdAt;
          bVal = b.createdAt;
          break;
        case "partner":
          aVal = a.partnerName;
          bVal = b.partnerName;
          break;
        case "type":
          aVal = a.type;
          bVal = b.type;
          break;
        case "description":
          aVal = a.description ?? "";
          bVal = b.description ?? "";
          break;
        case "lead":
          aVal = a.leadName ?? "";
          bVal = b.leadName ?? "";
          break;
        case "direction":
          aVal = a.direction;
          bVal = b.direction;
          break;
        case "amount":
          aVal = a.amount;
          bVal = b.amount;
          break;
        case "method":
          aVal = a.paymentMethod;
          bVal = b.paymentMethod;
          break;
        case "balanceAfter":
          aVal = a.balanceAfter;
          bVal = b.balanceAfter;
          break;
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return (aVal - bVal) * multiplier;
      }
      return String(aVal).localeCompare(String(bVal)) * multiplier;
    });
  }, [rows, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(
    async (overrides: Record<string, string> = {}, pageNum = 1) => {
      requestControllerRef.current?.abort();
      const controller = new AbortController();
      requestControllerRef.current = controller;
      setIsLoading(true);
      setLoadError("");
      try {
        const filters: Record<string, string> = {
          search,
          partnerId,
          dateFrom,
          dateTo,
          types: selectedTypes.join(","),
          direction,
          paymentMethod,
          page: String(pageNum),
          pageSize: "50",
          ...overrides,
        };
        const params = buildParams(filters);
        const res = await fetch(`/api/admin/transactions?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Could not load transactions.");
        const data = await res.json();
        setRows(data.rows);
        setSummary(data.summary);
        setTotalPages(data.pagination.totalPages);
        setPage(pageNum);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not load transactions.",
        );
      } finally {
        if (requestControllerRef.current === controller) {
          requestControllerRef.current = null;
          setIsLoading(false);
        }
      }
    },
    [
      search,
      partnerId,
      dateFrom,
      dateTo,
      selectedTypes,
      direction,
      paymentMethod,
    ],
  );

  useEffect(() => {
    if (initialFilteredFetchRef.current) return;
    initialFilteredFetchRef.current = true;
    if (searchParams.toString()) {
      void fetchData({}, page);
    }
  }, [fetchData, page, searchParams]);

  useEffect(
    () => () => {
      requestControllerRef.current?.abort();
    },
    [],
  );

  const applyFilters = useCallback(
    (overrides: Record<string, string> = {}, pageNum = 1) => {
      const filters: Record<string, string> = {
        search,
        partnerId,
        dateFrom,
        dateTo,
        types: selectedTypes.join(","),
        direction,
        paymentMethod,
        ...overrides,
      };
      const params = buildParams(filters);
      if (pageNum > 1) params.set("page", String(pageNum));
      const qs = params.toString();
      window.history.replaceState(
        window.history.state,
        "",
        qs ? `/admin/transactions?${qs}` : "/admin/transactions",
      );
      fetchData(overrides, pageNum);
    },
    [
      search,
      partnerId,
      dateFrom,
      dateTo,
      selectedTypes,
      direction,
      paymentMethod,
      fetchData,
    ],
  );

  function handleSearchChange(val: string) {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => applyFilters({ search: val }), 400);
  }

  function handlePartner(val: string) {
    setPartnerId(val);
    applyFilters({ partnerId: val });
  }

  function handleDateFrom(val: string) {
    setDateFrom(val);
    applyFilters({ dateFrom: val });
  }

  function handleDateTo(val: string) {
    setDateTo(val);
    applyFilters({ dateTo: val });
  }

  function handleTypeToggle(type: string) {
    const next = selectedTypes.includes(type)
      ? selectedTypes.filter((t) => t !== type)
      : [...selectedTypes, type];
    setSelectedTypes(next);
    applyFilters({ types: next.join(",") });
  }

  function handleDirection(val: string) {
    setDirection(val);
    applyFilters({ direction: val });
  }

  function handlePaymentMethod(val: string) {
    setPaymentMethod(val);
    applyFilters({ paymentMethod: val });
  }

  function clearAll() {
    setSearch("");
    setPartnerId("");
    setDateFrom("");
    setDateTo("");
    setSelectedTypes([]);
    setDirection("all");
    setPaymentMethod("all");
    window.history.replaceState(
      window.history.state,
      "",
      "/admin/transactions",
    );
    fetchData(
      {
        search: "",
        partnerId: "",
        dateFrom: "",
        dateTo: "",
        types: "",
        direction: "all",
        paymentMethod: "all",
      },
      1,
    );
  }

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  // Active filter pills
  const activePills: { label: string; clear: () => void }[] = [];
  if (search)
    activePills.push({
      label: `Search: "${search}"`,
      clear: () => {
        setSearch("");
        applyFilters({ search: "" });
      },
    });
  if (partnerId) {
    const p = partners.find((x) => x.id === partnerId);
    activePills.push({
      label: `Partner: ${p?.name ?? partnerId}`,
      clear: () => handlePartner(""),
    });
  }
  if (dateFrom)
    activePills.push({ label: `From: ${dateFrom}`, clear: () => handleDateFrom("") });
  if (dateTo)
    activePills.push({ label: `To: ${dateTo}`, clear: () => handleDateTo("") });
  for (const t of selectedTypes) {
    const tl = TYPE_LABEL[t] ?? t;
    activePills.push({ label: `Type: ${tl}`, clear: () => handleTypeToggle(t) });
  }
  if (direction !== "all")
    activePills.push({
      label: `Direction: ${direction}`,
      clear: () => handleDirection("all"),
    });
  if (paymentMethod !== "all")
    activePills.push({
      label: `Method: ${METHOD_LABEL[paymentMethod] ?? paymentMethod}`,
      clear: () => handlePaymentMethod("all"),
    });

  function handleExport() {
    const filters: Record<string, string> = {
      search,
      partnerId,
      dateFrom,
      dateTo,
      types: selectedTypes.join(","),
      direction,
      paymentMethod,
    };
    const params = buildParams(filters);
    params.set("export", "csv");
    window.location.href = `/api/admin/transactions?${params.toString()}`;
  }

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="min-w-0 flex-1">
        <PageHeader
          title="Transactions"
          subtitle="All wallet activity across every partner"
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                className="btn btn-secondary flex items-center gap-1.5"
              >
                <Funnel size={18} />
                Filters
              </button>
              <button
                onClick={handleExport}
                className="btn btn-secondary flex items-center gap-1.5"
              >
                <DownloadSimple size={18} />
                Export CSV
              </button>
            </div>
          }
        />

        {/* Summary cards */}
        <div className="mb-5 grid gap-4 sm:grid-cols-5">
          <StatCard
            label="Funding"
            value={formatUsd(summary.funding)}
            icon={TrendUp}
            accent="mint"
          />
          <StatCard
            label="Lead Revenue"
            value={formatUsd(summary.leadRevenue)}
            icon={Wallet}
            accent="blue"
          />
          <StatCard
            label="Refunds"
            value={formatUsd(Math.abs(summary.refunds))}
            icon={ArrowCounterClockwise}
            accent="orange"
          />
          <StatCard
            label="Net"
            value={formatUsd(summary.net)}
            icon={summary.net >= 0 ? TrendUp : TrendDown}
            accent={summary.net >= 0 ? "mint" : "red"}
            valueClassName={summary.net >= 0 ? "text-teal-700" : "text-red-600"}
          />
          <StatCard
            label="Count"
            value={summary.count.toLocaleString()}
            icon={forwardRef(function ListDuotone(props, ref) {
              return <List ref={ref as any} {...props} weight="BoldDuotone" />;
            })}
            accent="cyan"
          />
        </div>

        {/* Active filter pills */}
        {activePills.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {activePills.map((pill, i) => (
              <button
                key={i}
                onClick={pill.clear}
                className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800 hover:bg-teal-100 transition-colors"
              >
                {pill.label}
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            ))}
            <button
              onClick={clearAll}
              className="text-sm text-slate-500 underline hover:text-slate-700 transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Table */}
        {loadError ? (
          <StatusStrip
            status="error"
            title="Transactions could not be refreshed"
            message={loadError}
            className="mb-4"
          />
        ) : null}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="px-5 py-3" aria-busy="true" aria-label="Loading transactions">
                <table className="w-full text-base">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {[
                        "Date / Time",
                        "Partner",
                        "Type",
                        "Description",
                        "Lead",
                        "Direction",
                        "Amount",
                        "Method",
                        "Balance After",
                      ].map((label) => (
                        <th
                          key={label}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3.5"><Skeleton className="h-4 w-28" /></td>
                        <td className="px-4 py-3.5"><Skeleton className="h-4 w-32" /></td>
                        <td className="px-4 py-3.5"><Skeleton className="h-6 w-18 rounded-full" /></td>
                        <td className="px-4 py-3.5"><Skeleton className="h-4 w-40" /></td>
                        <td className="px-4 py-3.5"><Skeleton className="h-4 w-28" /></td>
                        <td className="px-4 py-3.5"><Skeleton className="h-6 w-16 rounded-full" /></td>
                        <td className="px-4 py-3.5 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                        <td className="px-4 py-3.5"><Skeleton className="h-4 w-14" /></td>
                        <td className="px-4 py-3.5 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : rows.length === 0 ? (
              <div className="px-5 py-12">
                <EmptyState
                  icon={Funnel}
                  title="No transactions match"
                  description="Try adjusting your filters or clearing them to see all transactions."
                  accent="teal"
                  action={
                    <button
                      onClick={clearAll}
                      className="btn btn-secondary"
                    >
                      Clear all filters
                    </button>
                  }
                />
              </div>
            ) : (
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {(
                      [
                        ["date", "Date / Time"],
                        ["partner", "Partner"],
                        ["type", "Type"],
                        ["description", "Description"],
                        ["lead", "Lead"],
                        ["direction", "Direction"],
                        ["amount", "Amount"],
                        ["method", "Method"],
                        ["balanceAfter", "Balance After"],
                      ] as [SortKey, string][]
                    ).map(([key, label]) => (
                      <PortalSortableHeaderCell
                        key={key}
                        label={label}
                        onClick={() => handleSort(key)}
                        active={sortKey === key}
                        dir={sortKey === key ? sortDir : "asc"}
                        headerClassName={clsx(
                          "!px-4 !py-2.5",
                          ["amount", "balanceAfter"].includes(key) && "text-right",
                        )}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sortedRows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Date */}
                      <td className="px-4 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                        {fmtDate(row.createdAt)}
                      </td>

                      {/* Partner */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-slate-800 whitespace-nowrap">
                          {row.partnerName}
                        </p>
                        <p className="text-xs text-slate-400">{row.partnerEmail}</p>
                      </td>

                      {/* Type badge */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            TYPE_BADGE[row.type] ?? "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {TYPE_LABEL[row.type] ?? row.type}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="px-4 py-3.5 max-w-[220px]">
                        <p className="text-sm text-slate-600 truncate">
                          {row.description ?? "—"}
                        </p>
                      </td>

                      {/* Lead */}
                      <td className="px-4 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                        {row.leadName ?? "—"}
                      </td>

                      {/* Direction */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            row.direction === "credit"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {row.direction === "credit" ? "Credit" : "Debit"}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <span
                          className={`text-base font-semibold ${
                            row.amount >= 0 ? "text-emerald-600" : "text-red-500"
                          }`}
                        >
                          {row.amount >= 0 ? "+" : ""}
                          {formatUsd(row.amount)}
                        </span>
                      </td>

                      {/* Method */}
                      <td className="px-4 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                        {METHOD_LABEL[row.paymentMethod] ?? row.paymentMethod}
                      </td>

                      {/* Balance After */}
                      <td className="px-4 py-3.5 text-right text-sm text-slate-500 whitespace-nowrap">
                        {formatUsd(row.balanceAfter)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between text-sm text-slate-500">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1 || isLoading}
                  onClick={() => applyFilters({}, page - 1)}
                  className="btn btn-sm btn-secondary disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages || isLoading}
                  onClick={() => applyFilters({}, page + 1)}
                  className="btn btn-sm btn-secondary disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter sheet */}
      <Sheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filters"
      >
        <SheetBody className="space-y-5">
          {/* Search */}
          <div>
            <label className="form-label text-xs">Search</label>
            <input
              type="search"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Partner, lead, ref, description"
              className="form-input py-2 text-sm w-full"
            />
          </div>

          {/* Partner */}
          <div>
            <label className="form-label text-xs">Partner</label>
            <select
              value={partnerId}
              onChange={(e) => handlePartner(e.target.value)}
              className="form-select py-2 text-sm w-full"
            >
              <option value="">All Partners</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="space-y-2">
            <label className="form-label text-xs">Date Range</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => handleDateFrom(e.target.value)}
              className="form-input py-2 text-sm w-full"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => handleDateTo(e.target.value)}
              className="form-input py-2 text-sm w-full"
            />
          </div>

          {/* Transaction types */}
          <div>
            <label className="form-label text-xs mb-2 block">
              Transaction Type
            </label>
            <div className="space-y-2">
              {TRANSACTION_TYPES.map((t) => (
                <label key={t.value} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(t.value)}
                    onChange={() => handleTypeToggle(t.value)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-slate-600">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Direction */}
          <div>
            <label className="form-label text-xs mb-2 block">Direction</label>
            <div className="space-y-2">
              {[
                { value: "all", label: "All" },
                { value: "credit", label: "Credit (in)" },
                { value: "debit", label: "Debit (out)" },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="direction"
                    checked={direction === opt.value}
                    onChange={() => handleDirection(opt.value)}
                    className="h-4 w-4 border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-slate-600">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="form-label text-xs">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => handlePaymentMethod(e.target.value)}
              className="form-select py-2 text-sm w-full"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {activePills.length > 0 && (
            <button
              onClick={clearAll}
              className="w-full text-sm text-slate-500 underline hover:text-slate-700 transition-colors text-left"
            >
              Clear all filters
            </button>
          )}
        </SheetBody>
      </Sheet>
    </div>
  );
}
