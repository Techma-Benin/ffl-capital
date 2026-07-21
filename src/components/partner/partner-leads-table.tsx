"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUp,
  ArrowDown,
  ArrowsDownUp,
  DotsThree,
  Eye,
  ArrowCounterClockwise,
  ShieldCheck,
  X,
  ICON_WEIGHT_LINEAR,
} from "@/lib/icons/client";

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

type SortKey = "name" | "state" | "type" | "channel" | "price" | "status" | "deliveredAt";

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowsDownUp size={12} className="opacity-30" />;
  return dir === "asc"
    ? <ArrowUp size={12} className="text-brand-700" />
    : <ArrowDown size={12} className="text-brand-700" />;
}

function ColHeader({
  label,
  sortKey,
  active,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-brand-600/70 select-none cursor-pointer whitespace-nowrap ${className ?? ""}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIcon active={active} dir={dir} />
      </span>
    </th>
  );
}

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

export function PartnerLeadsTable({ deliveries }: { deliveries: DeliveryRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [bulkRefundOpen, setBulkRefundOpen] = useState(false);
  const [refundDialogId, setRefundDialogId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("deliveredAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const sorted = useMemo(() => {
    return [...deliveries].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sortKey) {
        case "name":  av = `${a.lead.firstName} ${a.lead.lastName}`; bv = `${b.lead.firstName} ${b.lead.lastName}`; break;
        case "state": av = a.lead.state; bv = b.lead.state; break;
        case "type":  av = a.lead.leadType; bv = b.lead.leadType; break;
        case "channel": av = a.channel; bv = b.channel; break;
        case "price": av = a.price; bv = b.price; break;
        case "status":
          av = a.refundedAt ? "refunded" : a.refundStatus ?? "active";
          bv = b.refundedAt ? "refunded" : b.refundStatus ?? "active";
          break;
        case "deliveredAt": av = a.deliveredAt; bv = b.deliveredAt; break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [deliveries, sortKey, sortDir]);

  const refundable = deliveries.filter((d) => d.canRefund);
  const refundableSelected = refundable.filter((d) => selected.has(d.id));

  function toggleAll() {
    if (selected.size === refundable.length) setSelected(new Set());
    else setSelected(new Set(refundable.map((d) => d.id)));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
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
    } catch { /* allow retry */ }
    finally { setPending(false); }
  }

  const colProps = (key: SortKey) => ({
    sortKey: key,
    active: sortKey === key,
    dir: sortDir,
    onSort: toggleSort,
  });

  return (
    <>
      {/* Bulk refund bar */}
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

      {/* Table */}
      <div className="pb-2 pt-1">
        <table className="w-full border-separate border-spacing-y-2">
          <thead>
            <tr>
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  checked={refundable.length > 0 && selected.size === refundable.length}
                  onChange={toggleAll}
                  className="rounded border-slate-300"
                />
              </th>
              <ColHeader label="Lead" {...colProps("name")} />
              <ColHeader label="Contact" sortKey="state" active={false} dir={sortDir} onSort={() => {}} className="cursor-default" />
              <ColHeader label="Location" {...colProps("state")} />
              <ColHeader label="Type" {...colProps("type")} />
              <ColHeader label="Channel" {...colProps("channel")} />
              <ColHeader label="Price" {...colProps("price")} />
              <ColHeader label="Status" {...colProps("status")} />
              <ColHeader label="Delivered" {...colProps("deliveredAt")} />
              <th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((d) => (
              <tr
                key={d.id}
                className="bg-white shadow-sm hover:shadow-md transition-all group cursor-pointer"
                onClick={() => router.push(`/partner/leads/${d.id}`)}
              >
                {/* Checkbox */}
                <td className="rounded-l-xl px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    disabled={!d.canRefund}
                    checked={selected.has(d.id)}
                    onChange={() => toggle(d.id)}
                    className="rounded border-slate-300 disabled:opacity-30"
                  />
                </td>

                {/* Lead name */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <p className="font-semibold text-slate-900">
                    {d.lead.firstName} {d.lead.lastName}
                  </p>
                </td>

                {/* Contact (phone) */}
                <td className="px-4 py-3.5 whitespace-nowrap text-sm text-slate-500">
                  {d.lead.phone}
                </td>

                {/* Location */}
                <td className="px-4 py-3.5">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                    {d.lead.state}
                  </span>
                </td>

                {/* Type */}
                <td className="px-4 py-3.5">
                  <Badge variant="blue">
                    {d.lead.leadType === "traditional_iul" ? "Trad. IUL" : "High Intent"}
                  </Badge>
                </td>

                {/* Channel */}
                <td className="px-4 py-3.5">
                  <Badge variant={d.channel === "realtime" ? "green" : "purple"}>
                    {d.channel === "realtime" ? "Real-time" : "Aged"}
                  </Badge>
                </td>

                {/* Price */}
                <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-slate-900">
                  ${d.price.toFixed(2)}
                </td>

                {/* Status */}
                <td className="px-4 py-3.5">
                  {d.refundedAt ? (
                    <Badge variant="slate">Refunded</Badge>
                  ) : d.refundStatus ? (
                    <Badge variant="yellow">Refund {d.refundStatus}</Badge>
                  ) : (
                    <Badge variant="green">Active</Badge>
                  )}
                </td>

                {/* Delivered */}
                <td className="px-4 py-3.5 whitespace-nowrap text-sm text-slate-400" suppressHydrationWarning>
                  {new Date(d.deliveredAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>

                {/* Three-dots menu */}
                <td className="rounded-r-xl px-3 py-3.5 text-right">
                  <RowMenu
                    delivery={d}
                    onRefund={() => setRefundDialogId(d.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk refund dialog */}
      {bulkRefundOpen && (
        <BulkRefundDialog
          count={refundableSelected.length}
          pending={pending}
          onSubmit={bulkRefund}
          onClose={() => setBulkRefundOpen(false)}
        />
      )}

      {/* Single refund dialog */}
      {refundDialogId && (
        <RefundDialog
          deliveryId={refundDialogId}
          onClose={() => setRefundDialogId(null)}
        />
      )}
    </>
  );
}
