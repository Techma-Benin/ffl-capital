"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useNavigateWithPending } from "@/hooks/use-navigate-with-pending";
import { useLeadColumnSettingsBridge } from "@/components/leads/lead-column-settings-bridge";
import { LeadTableColumnPickerButton } from "@/components/leads/lead-table-column-picker-button";
import { Badge } from "@/components/ui/badge";
import {
  DotsThreeVertical,
  Eye,
  ArrowCounterClockwise,
  ICON_WEIGHT_LINEAR,
} from "@/lib/icons/client";
import { formatDateTime } from "@/lib/format-datetime";
import { formatUsd } from "@/lib/format-money";
import {
  PortalDataTable,
  portalTableCell,
  portalTableCellFirst,
  portalTableCellLast,
  portalTableRowClassName,
  type PortalDataTableColumn,
} from "@/components/ui/portal-data-table";
import { RefundRequestModal } from "@/components/refunds/refund-request-modal";

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

function PartnerLeadRefundDialog({
  deliveryId,
  onClose,
}: {
  deliveryId: string;
  onClose: () => void;
}) {
  const router = useRouter();

  return (
    <RefundRequestModal
      open
      onClose={onClose}
      title="Request Refund"
      submitLabel="Submit"
      onSubmit={async ({ refundType, reason }) => {
        const res = await fetch("/api/refunds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadDeliveryId: deliveryId,
            refundType,
            reason: reason || undefined,
          }),
        });
        if (!res.ok) throw new Error("Request failed");
        onClose();
        router.refresh();
      }}
    />
  );
}

function RowMenu({
  delivery,
  onRefund,
}: {
  delivery: DeliveryRow;
  onRefund: () => void;
}) {
  const { push } = useNavigateWithPending();
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
    <div
      ref={ref}
      className="relative flex justify-end"
      onClick={(e) => e.stopPropagation()}
    >
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
              push(`/partner/leads/${delivery.id}`);
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
  const { push, router } = useNavigateWithPending();
  const columnSettingsBridge = useLeadColumnSettingsBridge();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [bulkRefundOpen, setBulkRefundOpen] = useState(false);
  const [refundDialogId, setRefundDialogId] = useState<string | null>(null);

  const refundable = deliveries.filter((d) => d.canRefund);
  const refundableSelected = refundable.filter((d) => selected.has(d.id));
  const columnKeys = columns.map((c) => c.key);

  const headerColumns = useMemo(() => {
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
            {formatUsd(d.price)}
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
            onClick={() => push(`/partner/leads/${d.id}`)}
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
        <RefundRequestModal
          open
          onClose={() => setBulkRefundOpen(false)}
          title="Request Refund"
          titleHighlight={
            <span className="text-amber-600">({refundableSelected.length})</span>
          }
          submitLabel={`Submit (${refundableSelected.length})`}
          submitIcon={<ArrowCounterClockwise size={14} />}
          submitClassName="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3.5 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
          isSubmitting={pending}
          onSubmit={({ refundType, reason }) => {
            void bulkRefund(refundType, reason);
          }}
        />
      )}

      {refundDialogId && (
        <PartnerLeadRefundDialog
          deliveryId={refundDialogId}
          onClose={() => setRefundDialogId(null)}
        />
      )}
    </>
  );
}
