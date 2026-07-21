"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  DotsThree,
  Eye,
  ArrowCounterClockwise,
  X,
  ICON_WEIGHT_LINEAR,
} from "@/lib/icons/client";
import { formatDateTime } from "@/lib/format-datetime";
import {
  PortalDataTable,
  portalTableCell,
  portalTableCellFirst,
  portalTableCellLast,
  portalTableRowClassName,
  type PortalDataTableColumn,
} from "@/components/ui/portal-data-table";

type DeliveryRow = {
  id: string;
  price: number;
  channel: string;
  deliveredAt: string;
  refundedAt: string | null;
  canRefund: boolean;
  refundStatus: string | null;
  lead: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    state: string;
    address: string | null;
    leadType: string;
    intent: string | null;
    haveIul: string | null;
    primaryGoal: string | null;
    refundable: boolean;
    trustedformCertUrl: string | null;
  };
};

function BulkRefundDialog({
  count,
  pending,
  onSubmit,
  onClose,
}: {
  count: number;
  pending: boolean;
  onSubmit: (refundType: "wrong_filter" | "invalid_phone", reason: string) => void;
  onClose: () => void;
}) {
  const [refundType, setRefundType] = useState<"wrong_filter" | "invalid_phone">("wrong_filter");
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            Request Refund <span className="text-amber-600">({count})</span>
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} weight={ICON_WEIGHT_LINEAR} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Refund Type</label>
            <select
              value={refundType}
              onChange={(e) => setRefundType(e.target.value as "wrong_filter" | "invalid_phone")}
              className="form-select w-full text-sm"
            >
              <option value="wrong_filter">Wrong Filter</option>
              <option value="invalid_phone">Invalid Phone</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the issue…"
              rows={3}
              className="form-input w-full text-sm resize-none"
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button
            type="button"
            disabled={pending}
            onClick={() => onSubmit(refundType, reason)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3.5 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
          >
            <ArrowCounterClockwise size={14} />
            {pending ? "Submitting…" : `Submit (${count})`}
          </button>
        </div>
      </div>
    </div>
  );
}

function RefundDialog({
  deliveryId,
  onClose,
}: {
  deliveryId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [refundType, setRefundType] = useState<"wrong_filter" | "invalid_phone">("wrong_filter");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadDeliveryId: deliveryId, refundType, reason: reason || undefined }),
      });
      if (!res.ok) throw new Error("Request failed");
      onClose();
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Request Refund</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} weight={ICON_WEIGHT_LINEAR} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Refund Type</label>
            <select
              value={refundType}
              onChange={(e) => setRefundType(e.target.value as "wrong_filter" | "invalid_phone")}
              className="form-select w-full text-sm"
            >
              <option value="wrong_filter">Wrong Filter</option>
              <option value="invalid_phone">Invalid Phone</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the issue…"
              rows={3}
              className="form-input w-full text-sm resize-none"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button type="button" onClick={submit} disabled={pending} className="btn-primary btn-sm">
            {pending ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RowMenu({
  delivery,
  onRefund,
}: {
  delivery: DeliveryRow;
  onRefund: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
      >
        <DotsThree size={18} weight={ICON_WEIGHT_LINEAR} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-30 w-44 rounded-xl border border-slate-100 bg-white py-1.5 shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            onClick={() => {
              setOpen(false);
              router.push(`/partner/leads/${delivery.id}`);
            }}
          >
            <Eye size={14} className="text-slate-400" />
            View Lead
          </button>

          {delivery.canRefund && (
            <button
              type="button"
              className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 transition-colors"
              onClick={() => {
                setOpen(false);
                onRefund();
              }}
            >
              <ArrowCounterClockwise size={14} className="text-amber-500" />
              Request Refund
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function PartnerLeadsTable({
  deliveries,
  columns,
  sort,
}: {
  deliveries: DeliveryRow[];
  columns: PortalDataTableColumn[];
  sort?: {
    active?: string;
    dir: "asc" | "desc";
    hrefBySortKey: Record<string, string>;
  };
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [bulkRefundOpen, setBulkRefundOpen] = useState(false);
  const [refundDialogId, setRefundDialogId] = useState<string | null>(null);

  const refundable = deliveries.filter((d) => d.canRefund);
  const refundableSelected = refundable.filter((d) => selected.has(d.id));
  const columnKeys = columns.map((c) => c.key);

  function toggleAll() {
    if (selected.size === refundable.length) setSelected(new Set());
    else setSelected(new Set(refundable.map((d) => d.id)));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkRefund(refundType: "wrong_filter" | "invalid_phone", reason: string) {
    if (!refundableSelected.length) return;
    setPending(true);
    try {
      const res = await fetch("/api/refunds/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: refundableSelected.map((d) => ({
            leadDeliveryId: d.id,
            refundType,
            reason: reason || undefined,
          })),
        }),
      });
      if (!res.ok) throw new Error();
      setSelected(new Set());
      setBulkRefundOpen(false);
      router.refresh();
    } catch {
      /* allow retry */
    } finally {
      setPending(false);
    }
  }

  function renderCell(key: string, d: DeliveryRow, isFirst: boolean, isLast: boolean) {
    const cellClass = isFirst
      ? portalTableCellFirst
      : isLast
        ? portalTableCellLast
        : portalTableCell;

    switch (key) {
      case "select":
        return (
          <td
            key={key}
            className={portalTableCellFirst}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              disabled={!d.canRefund}
              checked={selected.has(d.id)}
              onChange={() => toggle(d.id)}
              className="rounded border-slate-300 disabled:opacity-30"
            />
          </td>
        );
      case "name":
        return (
          <td key={key} className={`whitespace-nowrap ${cellClass}`}>
            <p className="font-semibold text-slate-900">
              {d.lead.firstName} {d.lead.lastName}
            </p>
          </td>
        );
      case "contact":
        return (
          <td key={key} className={`whitespace-nowrap text-sm text-slate-500 ${cellClass}`}>
            {d.lead.phone}
          </td>
        );
      case "location":
        return (
          <td key={key} className={cellClass}>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
              {d.lead.state}
            </span>
          </td>
        );
      case "type":
        return (
          <td key={key} className={cellClass}>
            <Badge variant="purple">
              {d.lead.leadType === "traditional_iul" ? "Trad. IUL" : "High Intent"}
            </Badge>
          </td>
        );
      case "channel":
        return (
          <td key={key} className={cellClass}>
            <Badge variant={d.channel === "realtime" ? "green" : "purple"}>
              {d.channel === "realtime" ? "Real-time" : "Aged"}
            </Badge>
          </td>
        );
      case "price":
        return (
          <td key={key} className={`whitespace-nowrap font-semibold text-slate-900 ${cellClass}`}>
            ${d.price.toFixed(2)}
          </td>
        );
      case "status":
        return (
          <td key={key} className={cellClass}>
            {d.refundedAt ? (
              <Badge variant="slate">Refunded</Badge>
            ) : d.refundStatus ? (
              <Badge variant="yellow">Refund {d.refundStatus}</Badge>
            ) : (
              <Badge variant="green">Active</Badge>
            )}
          </td>
        );
      case "delivered":
        return (
          <td
            key={key}
            className={`whitespace-nowrap text-sm text-slate-400 ${cellClass}`}
            suppressHydrationWarning
          >
            {formatDateTime(d.deliveredAt)}
          </td>
        );
      case "actions":
        return (
          <td key={key} className={`text-right ${portalTableCellLast}`}>
            <RowMenu delivery={d} onRefund={() => setRefundDialogId(d.id)} />
          </td>
        );
      default:
        return null;
    }
  }

  const headerColumns =
    columnKeys.includes("select")
      ? columns
      : columns;

  return (
    <>
      {selected.size > 0 && (
        <div className="flex items-center justify-end gap-2 px-4 py-2">
          <button
            type="button"
            disabled={!refundableSelected.length}
            onClick={() => setBulkRefundOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3.5 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-40"
          >
            <ArrowCounterClockwise size={14} />
            Request Refund ({refundableSelected.length})
          </button>
        </div>
      )}

      {columnKeys.includes("select") && (
        <div className="mb-1 flex px-3">
          <input
            type="checkbox"
            checked={refundable.length > 0 && selected.size === refundable.length}
            onChange={toggleAll}
            className="rounded border-slate-300"
            aria-label="Select all refundable leads"
          />
        </div>
      )}

      <PortalDataTable columns={headerColumns} sort={sort}>
        {deliveries.map((d) => (
          <tr
            key={d.id}
            className={`cursor-pointer ${portalTableRowClassName()}`}
            onClick={() => router.push(`/partner/leads/${d.id}`)}
          >
            {headerColumns.map((col, i) =>
              renderCell(
                col.key,
                d,
                i === 0,
                i === headerColumns.length - 1,
              ),
            )}
          </tr>
        ))}
      </PortalDataTable>

      {bulkRefundOpen && (
        <BulkRefundDialog
          count={refundableSelected.length}
          pending={pending}
          onSubmit={bulkRefund}
          onClose={() => setBulkRefundOpen(false)}
        />
      )}

      {refundDialogId && (
        <RefundDialog
          deliveryId={refundDialogId}
          onClose={() => setRefundDialogId(null)}
        />
      )}
    </>
  );
}
