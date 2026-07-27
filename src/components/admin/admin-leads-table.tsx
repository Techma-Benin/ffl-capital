"use client";

import { useEffect, useRef, useState } from "react";
import { useNavigateWithPending } from "@/hooks/use-navigate-with-pending";
import { Badge } from "@/components/ui/badge";
import {
  PortalDataTable,
  portalTableCell,
  portalTableCellFirst,
  portalTableCellLast,
  portalTableDataCellClassName,
  portalTableRowClassName,
  portalRowActionsCellClassName,
  portalRowKebabTriggerClassName,
  type PortalDataTableLayout,
} from "@/components/ui/portal-data-table";
import { formatDateTime } from "@/lib/format-datetime";
import { moneyCellClass } from "@/lib/format-money";
import type { PortalDataTableColumn } from "@/components/ui/portal-data-table";
import {
  ArrowsClockwise,
  ArrowUpRight,
  DotsThreeVertical,
  Eye,
  ICON_WEIGHT_LINEAR,
} from "@/lib/icons/client";

type LeadRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  state: string;
  leadType: string;
  status: string;
  available: boolean;
  receivedAt: Date;
  trustedformCertUrl: string | null;
  partnerName: string | null;
  price: string | null;
};

function isEligibleForReprocess(lead: LeadRow): boolean {
  return lead.status === "unmatched" && lead.available;
}

function adminLeadHasExtraRowActions(lead: LeadRow): boolean {
  return !!lead.trustedformCertUrl || isEligibleForReprocess(lead);
}

function AdminLeadRowMenu({
  lead,
  layout,
  onReprocessed,
}: {
  lead: LeadRow;
  layout: PortalDataTableLayout;
  onReprocessed?: () => void;
}) {
  const { push, router } = useNavigateWithPending();
  const [open, setOpen] = useState(false);
  const [reprocessPending, setReprocessPending] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const canReprocess = isEligibleForReprocess(lead);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  async function handleReprocess() {
    setReprocessPending(true);
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/reprocess`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Request failed");
      setOpen(false);
      if (onReprocessed) onReprocessed();
      else router.refresh();
    } catch {
      // allow retry
    } finally {
      setReprocessPending(false);
    }
  }

  return (
    <div ref={ref} className="relative flex justify-end" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={portalRowKebabTriggerClassName(layout, { revealed: open })}
        aria-label="Lead actions"
        aria-expanded={open}
      >
        <DotsThreeVertical size={18} weight={ICON_WEIGHT_LINEAR} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-30 w-44 rounded-xl border border-slate-100 bg-white py-1.5 shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            onClick={() => {
              setOpen(false);
              push(`/admin/leads/${lead.id}`);
            }}
          >
            <Eye size={14} className="text-slate-400" />
            View lead
          </button>

          {lead.trustedformCertUrl && (
            <a
              href={lead.trustedformCertUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              <ArrowUpRight size={14} className="text-slate-400" />
              TrustedForm cert
            </a>
          )}

          {canReprocess && (
            <button
              type="button"
              disabled={reprocessPending}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-brand-700 hover:bg-brand-50 transition-colors disabled:opacity-50"
              onClick={handleReprocess}
            >
              <ArrowsClockwise
                size={14}
                className={`text-brand-600 ${reprocessPending ? "animate-spin" : ""}`}
              />
              {reprocessPending ? "Processing…" : "Reprocess"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminLeadsTable({
  leads,
  columns,
  sort,
  layout = "cards",
  tableFooter,
}: {
  leads: LeadRow[];
  columns: PortalDataTableColumn[];
  sort?: {
    active?: string;
    dir: "asc" | "desc";
    hrefBySortKey: Record<string, string>;
  };
  layout?: PortalDataTableLayout;
  tableFooter?: React.ReactNode;
}) {
  const { router } = useNavigateWithPending();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  const eligibleLeads = leads.filter(isEligibleForReprocess);
  const eligibleIds = new Set(eligibleLeads.map((l) => l.id));

  const allEligibleSelected =
    eligibleLeads.length > 0 &&
    eligibleLeads.every((l) => selectedIds.has(l.id));
  const someSelected = selectedIds.size > 0;

  function toggleAll() {
    if (allEligibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(eligibleLeads.map((l) => l.id)));
    }
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleBulkReprocess() {
    if (bulkPending || selectedIds.size === 0) return;
    setBulkPending(true);
    setBulkFeedback(null);
    try {
      const res = await fetch("/api/admin/leads/bulk-reprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error("Bulk reprocess failed");
      const data = (await res.json()) as { processed: number; errors: number };
      setSelectedIds(new Set());
      setBulkFeedback({
        kind: data.errors === 0 ? "success" : "error",
        message:
          data.errors === 0
            ? `${data.processed} lead${data.processed === 1 ? "" : "s"} queued for reprocessing.`
            : `${data.processed} queued, ${data.errors} failed.`,
      });
      router.refresh();
    } catch {
      setBulkFeedback({ kind: "error", message: "Bulk reprocess failed. Please try again." });
    } finally {
      setBulkPending(false);
    }
  }

  // Build the checkbox column with header content
  const checkboxHeaderContent =
    eligibleLeads.length > 0 ? (
      <input
        type="checkbox"
        aria-label="Select all eligible leads"
        checked={allEligibleSelected}
        onChange={toggleAll}
        className="h-4 w-4 rounded border-slate-300 text-brand-600 accent-brand-600 cursor-pointer"
      />
    ) : null;

  // Prepend a checkbox column to the display columns
  const checkboxCol: PortalDataTableColumn = {
    key: "_checkbox",
    label: "",
    headerContent: checkboxHeaderContent,
  };
  const displayColumns = [checkboxCol, ...columns];

  function cellClass(
    options: { first?: boolean; last?: boolean; className?: string } = {},
  ) {
    return (
      portalTableDataCellClassName(layout, options) ??
      options.className ??
      portalTableCell
    );
  }

  function cell(key: string, lead: LeadRow, index: number, total: number) {
    const first = index === 0;
    const last = index === total - 1;
    switch (key) {
      case "_checkbox": {
        const eligible = isEligibleForReprocess(lead);
        return (
          <td
            key={key}
            className={cellClass({ first, last, className: "w-8" })}
            onClick={(e) => e.stopPropagation()}
          >
            {eligible && (
              <input
                type="checkbox"
                aria-label="Select lead"
                checked={selectedIds.has(lead.id)}
                onChange={() => toggleRow(lead.id)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 accent-brand-600 cursor-pointer"
              />
            )}
          </td>
        );
      }
      case "id":
        return (
          <td
            key={key}
            className={cellClass({
              first,
              last,
              className: "font-mono text-xs text-slate-400",
            })}
          >
            {lead.id.slice(0, 8)}…
          </td>
        );
      case "name":
        return (
          <td key={key} className={cellClass({ first, last })}>
            <p className="font-medium text-slate-900">
              {lead.firstName} {lead.lastName}
            </p>
            <p className="text-xs text-slate-400">{lead.email}</p>
          </td>
        );
      case "phone":
        return (
          <td
            key={key}
            className={cellClass({ first, last, className: "text-slate-500" })}
          >
            {lead.phone}
          </td>
        );
      case "state":
        return (
          <td key={key} className={cellClass({ first, last })}>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">
              {lead.state}
            </span>
          </td>
        );
      case "type":
        return (
          <td key={key} className={cellClass({ first, last })}>
            <Badge variant="purple">
              {lead.leadType === "traditional_iul" ? "Trad. IUL" : "High Intent"}
            </Badge>
          </td>
        );
      case "status":
        return (
          <td key={key} className={cellClass({ first, last })}>
            <LeadStatusBadge status={lead.status} />
          </td>
        );
      case "partner":
        return (
          <td
            key={key}
            className={cellClass({ first, last, className: "text-slate-600" })}
          >
            {lead.partnerName ?? <span className="text-slate-300">—</span>}
          </td>
        );
      case "price":
        return (
          <td
            key={key}
            className={cellClass({
              first,
              last,
              className: moneyCellClass("font-semibold text-slate-700"),
            })}
          >
            {lead.price ?? <span className="text-slate-300">—</span>}
          </td>
        );
      case "received":
        return (
          <td
            key={key}
            className={cellClass({
              first,
              last,
              className: "text-slate-400 text-xs",
            })}
            suppressHydrationWarning
          >
            {formatDateTime(lead.receivedAt)}
          </td>
        );
      case "trustedform":
        return (
          <td key={key} className={cellClass({ first, last })}>
            {lead.trustedformCertUrl ? (
              <a
                href={lead.trustedformCertUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-orange-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                View cert
              </a>
            ) : (
              <span className="text-xs text-slate-300">—</span>
            )}
          </td>
        );
      case "actions":
        return (
          <td
            key={key}
            className={portalRowActionsCellClassName(
              layout,
              cellClass({ first, last }),
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {adminLeadHasExtraRowActions(lead) ? (
              <AdminLeadRowMenu
                lead={lead}
                layout={layout}
                onReprocessed={() => router.refresh()}
              />
            ) : null}
          </td>
        );
      default:
        return null;
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Bulk action toolbar */}
      {someSelected && (
        <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5">
          <span className="text-sm font-medium text-brand-800">
            {selectedIds.size} lead{selectedIds.size === 1 ? "" : "s"} selected
          </span>
          <button
            type="button"
            disabled={bulkPending}
            onClick={handleBulkReprocess}
            className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
          >
            <ArrowsClockwise
              size={14}
              className={bulkPending ? "animate-spin" : ""}
            />
            {bulkPending
              ? "Processing…"
              : `Reprocess Selected (${selectedIds.size})`}
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-brand-600 hover:text-brand-800 transition-colors"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Feedback banner */}
      {bulkFeedback && (
        <div
          className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
            bulkFeedback.kind === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <span>{bulkFeedback.message}</span>
          <button
            type="button"
            onClick={() => setBulkFeedback(null)}
            className="ml-4 text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      <PortalDataTable
        columns={displayColumns}
        sort={sort}
        layout={layout}
        footer={tableFooter}
      >
        {leads.map((lead) => (
          <tr
            key={lead.id}
            className={`cursor-pointer ${portalTableRowClassName(undefined, layout)}`}
            onClick={() => {
              window.location.href = `/admin/leads/${lead.id}`;
            }}
          >
            {displayColumns.map((c, i) =>
              cell(c.key, lead, i, displayColumns.length),
            )}
          </tr>
        ))}
      </PortalDataTable>
    </div>
  );
}

function LeadStatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { variant: "green" | "yellow" | "red" | "blue" | "slate"; label: string }
  > = {
    delivered: { variant: "green", label: "Delivered" },
    unmatched: { variant: "yellow", label: "Unmatched" },
    integrity_posted: { variant: "blue", label: "Integrity" },
    aged_listed: { variant: "slate", label: "Aged" },
    dead: { variant: "red", label: "Dead" },
  };
  const c = config[status] ?? { variant: "slate" as const, label: status };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
