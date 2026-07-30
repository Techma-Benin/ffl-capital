"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useNavigateWithPending } from "@/hooks/use-navigate-with-pending";
import { Badge } from "@/components/ui/badge";
import {
  DotsThreeVertical,
  Eye,
  Wallet,
  ICON_WEIGHT_LINEAR,
} from "@/lib/icons/client";
import { formatDateTime } from "@/lib/format-datetime";
import { formatUsd, moneyCellClass } from "@/lib/format-money";
import {
  PortalDataTable,
  portalTableCell,
  portalTableDataCellClassName,
  portalTableRowClassName,
  portalRowActionsCellClassName,
  portalRowKebabTriggerClassName,
  type PortalDataTableColumn,
  type PortalDataTableLayout,
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
    leadTypeLabel: string;
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
      title="Report an invalid number"
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
  layout,
}: {
  delivery: DeliveryRow;
  onRefund: () => void;
  layout: PortalDataTableLayout;
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
              push(`/partner/leads/${delivery.id}`);
            }}
          >
            <Eye size={14} className="text-slate-400" />
            View lead
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
              <Wallet
                size={14}
                weight={ICON_WEIGHT_LINEAR}
                className="shrink-0 text-amber-500"
              />
              Report invalid number
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
  layout = "cards",
  tableFooter,
}: {
  deliveries: DeliveryRow[];
  columns: PortalDataTableColumn[];
  sort?: {
    active?: string;
    dir: "asc" | "desc";
    hrefBySortKey: Record<string, string>;
  };
  layout?: PortalDataTableLayout;
  tableFooter?: React.ReactNode;
}) {
  const { push, router } = useNavigateWithPending();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [bulkRefundOpen, setBulkRefundOpen] = useState(false);
  const [refundDialogId, setRefundDialogId] = useState<string | null>(null);

  const refundable = deliveries.filter((d) => d.canRefund);
  const refundableSelected = refundable.filter((d) => selected.has(d.id));
  const selectAllChecked =
    refundable.length > 0 && selected.size === refundable.length;

  const toggleAll = useCallback(() => {
    if (selected.size === refundable.length) setSelected(new Set());
    else setSelected(new Set(refundable.map((d) => d.id)));
  }, [refundable, selected.size]);

  const bulkRefundLabel =
    refundableSelected.length > 0
      ? `Report invalid (${refundableSelected.length})`
      : "Report invalid";

  const headerColumns = useMemo(() => {
    return columns.map((col) => {
      if (col.key === "select") {
        return {
          ...col,
          headerClassName: col.headerClassName ?? "w-10",
          headerContent: (
            <input
              type="checkbox"
              checked={selectAllChecked}
              onChange={toggleAll}
              className="rounded border-slate-300"
              aria-label="Select all refundable leads"
            />
          ),
        };
      }
      if (col.key === "actions") {
        const hideActionsHeader =
          layout === "cards" && selected.size === 0;
        const baseHeaderClass = col.headerClassName ?? "w-12 text-right";
        return {
          ...col,
          headerClassName: hideActionsHeader
            ? `${baseHeaderClass} invisible`
            : baseHeaderClass,
          headerContent: hideActionsHeader ? null : (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={!refundableSelected.length}
                onClick={(e) => {
                  e.stopPropagation();
                  setBulkRefundOpen(true);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-amber-600 disabled:pointer-events-none disabled:opacity-40"
                aria-label={bulkRefundLabel}
                title={bulkRefundLabel}
              >
                <Wallet
                  size={18}
                  weight={ICON_WEIGHT_LINEAR}
                  className="shrink-0"
                  aria-hidden
                />
              </button>
            </div>
          ),
        };
      }
      return col;
    });
  }, [
    columns,
    layout,
    selected.size,
    selectAllChecked,
    toggleAll,
    bulkRefundLabel,
    refundableSelected.length,
  ]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkRefund(reason: string) {
    if (!refundableSelected.length) return;
    setPending(true);
    try {
      const res = await fetch("/api/refunds/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: refundableSelected.map((d) => ({
            leadDeliveryId: d.id,
            refundType: "invalid_phone" as const,
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

  function cellClass(
    options: { first?: boolean; last?: boolean; className?: string } = {},
  ) {
    return (
      portalTableDataCellClassName(layout, options) ??
      options.className ??
      portalTableCell
    );
  }

  function renderCell(
    key: string,
    d: DeliveryRow,
    index: number,
    total: number,
  ) {
    const first = index === 0;
    const last = index === total - 1;

    switch (key) {
      case "select":
        return (
          <td
            key={key}
            className={cellClass({ first, last })}
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
          <td key={key} className={cellClass({ first, last })}>
            <p className="font-medium text-slate-900">
              {d.lead.firstName} {d.lead.lastName}
            </p>
            <p className="text-xs text-slate-400">{d.lead.email}</p>
          </td>
        );
      case "contact":
        return (
          <td
            key={key}
            className={cellClass({ first, last, className: "text-slate-500" })}
          >
            {d.lead.phone}
          </td>
        );
      case "location":
        return (
          <td key={key} className={cellClass({ first, last })}>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">
              {d.lead.state}
            </span>
          </td>
        );
      case "type":
        return (
          <td key={key} className={cellClass({ first, last })}>
            <Badge variant="purple">
              {d.lead.leadTypeLabel}
            </Badge>
          </td>
        );
      case "channel":
        return (
          <td key={key} className={cellClass({ first, last })}>
            <Badge variant={d.channel === "realtime" ? "green" : "purple"}>
              {d.channel === "realtime" ? "Real-time" : "Aged"}
            </Badge>
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
            {formatUsd(d.price)}
          </td>
        );
      case "status":
        return (
          <td key={key} className={cellClass({ first, last })}>
            {d.refundedAt ? (
              <Badge variant="slate">Refunded</Badge>
            ) : d.refundStatus ? (
              <Badge variant="yellow">Invalid # {d.refundStatus}</Badge>
            ) : (
              <Badge variant="green">Active</Badge>
            )}
          </td>
        );
      case "delivered":
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
            {formatDateTime(d.deliveredAt)}
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
            {d.canRefund ? (
              <RowMenu
                delivery={d}
                layout={layout}
                onRefund={() => setRefundDialogId(d.id)}
              />
            ) : null}
          </td>
        );
      default:
        return null;
    }
  }

  return (
    <>
      <PortalDataTable
        columns={headerColumns}
        sort={sort}
        layout={layout}
        footer={tableFooter}
      >
        {deliveries.map((d) => (
          <tr
            key={d.id}
            className={`cursor-pointer ${portalTableRowClassName(undefined, layout)}`}
            onClick={() => push(`/partner/leads/${d.id}`)}
          >
            {headerColumns.map((col, i) =>
              renderCell(col.key, d, i, headerColumns.length),
            )}
          </tr>
        ))}
      </PortalDataTable>

      {bulkRefundOpen && (
        <RefundRequestModal
          open
          onClose={() => setBulkRefundOpen(false)}
          title="Report invalid numbers"
          titleHighlight={
            <span className="text-amber-600">({refundableSelected.length})</span>
          }
          submitLabel={`Submit (${refundableSelected.length})`}
          submitIcon={
            <Wallet size={14} weight={ICON_WEIGHT_LINEAR} className="shrink-0" />
          }
          submitClassName="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3.5 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
          isSubmitting={pending}
          onSubmit={({ reason }) => {
            void bulkRefund(reason);
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
