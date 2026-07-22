"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLeadColumnSettingsBridge } from "@/components/leads/lead-column-settings-bridge";
import { LeadTableColumnPickerButton } from "@/components/leads/lead-table-column-picker-button";
import { useNavigateWithPending } from "@/hooks/use-navigate-with-pending";
import { Badge } from "@/components/ui/badge";
import {
  PortalDataTable,
  portalTableCell,
  portalTableCellFirst,
  portalTableCellLast,
  portalTableRowClassName,
} from "@/components/ui/portal-data-table";
import { formatDateTime } from "@/lib/format-datetime";
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

function AdminLeadRowMenu({ lead }: { lead: LeadRow }) {
  const { push, router } = useNavigateWithPending();
  const [open, setOpen] = useState(false);
  const [reprocessPending, setReprocessPending] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const canReprocess = lead.status === "unmatched" && lead.available;

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
      router.refresh();
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
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
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
}: {
  leads: LeadRow[];
  columns: PortalDataTableColumn[];
  sort?: {
    active?: string;
    dir: "asc" | "desc";
    hrefBySortKey: Record<string, string>;
  };
}) {
  const columnSettingsBridge = useLeadColumnSettingsBridge();
  const displayColumns = useMemo(() => {
    if (!columnSettingsBridge) return columns;
    return columns.map((col) => {
      if (col.key !== "actions") return col;
      return {
        ...col,
        headerClassName: col.headerClassName ?? "w-12 text-center",
        headerContent: (
          <LeadTableColumnPickerButton
            onClick={columnSettingsBridge.openColumnSettings}
          />
        ),
      };
    });
  }, [columns, columnSettingsBridge]);

  const visibleKeys = new Set(displayColumns.map((c) => c.key));

  function cell(key: string, lead: LeadRow) {
    switch (key) {
      case "id":
        return (
          <td key={key} className={`font-mono text-xs text-slate-400 ${portalTableCellFirst}`}>
            {lead.id.slice(0, 8)}…
          </td>
        );
      case "name":
        return (
          <td key={key} className={portalTableCell}>
            <p className="font-medium text-slate-900">
              {lead.firstName} {lead.lastName}
            </p>
            <p className="text-xs text-slate-400">{lead.email}</p>
          </td>
        );
      case "phone":
        return (
          <td key={key} className={`text-slate-500 ${portalTableCell}`}>
            {lead.phone}
          </td>
        );
      case "state":
        return (
          <td key={key} className={portalTableCell}>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">
              {lead.state}
            </span>
          </td>
        );
      case "type":
        return (
          <td key={key} className={portalTableCell}>
            <Badge variant="purple">
              {lead.leadType === "traditional_iul" ? "Trad. IUL" : "High Intent"}
            </Badge>
          </td>
        );
      case "status":
        return (
          <td key={key} className={portalTableCell}>
            <LeadStatusBadge status={lead.status} />
          </td>
        );
      case "partner":
        return (
          <td key={key} className={`text-slate-600 ${portalTableCell}`}>
            {lead.partnerName ?? <span className="text-slate-300">—</span>}
          </td>
        );
      case "price":
        return (
          <td key={key} className={`font-semibold text-slate-700 ${portalTableCell}`}>
            {lead.price ?? <span className="text-slate-300">—</span>}
          </td>
        );
      case "received":
        return (
          <td
            key={key}
            className={`text-slate-400 text-xs ${portalTableCell}`}
            suppressHydrationWarning
          >
            {formatDateTime(lead.receivedAt)}
          </td>
        );
      case "trustedform":
        return (
          <td key={key} className={portalTableCell}>
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
          <td key={key} className={portalTableCellLast}>
            <AdminLeadRowMenu lead={lead} />
          </td>
        );
      default:
        return null;
    }
  }

  return (
    <PortalDataTable columns={displayColumns} sort={sort}>
      {leads.map((lead) => (
        <tr
          key={lead.id}
          className={`cursor-pointer ${portalTableRowClassName()}`}
          onClick={() => {
            window.location.href = `/admin/leads/${lead.id}`;
          }}
        >
          {displayColumns
            .filter((c) => visibleKeys.has(c.key))
            .map((c) => cell(c.key, lead))}
        </tr>
      ))}
    </PortalDataTable>
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
