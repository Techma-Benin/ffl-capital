"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PartnerRefundButton } from "@/components/partner/partner-refund-button";
import { ShieldCheck } from "lucide-react";

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

export function PartnerLeadsTable({
  deliveries,
}: {
  deliveries: DeliveryRow[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [refundType, setRefundType] = useState<"wrong_filter" | "invalid_phone">(
    "wrong_filter",
  );

  const refundableSelected = deliveries.filter(
    (d) => selected.has(d.id) && d.canRefund,
  );

  function toggleAll() {
    const refundable = deliveries.filter((d) => d.canRefund).map((d) => d.id);
    if (selected.size === refundable.length) setSelected(new Set());
    else setSelected(new Set(refundable));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkRefund() {
    if (refundableSelected.length === 0) return;
    setPending(true);
    try {
      const res = await fetch("/api/refunds/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: refundableSelected.map((d) => ({
            leadDeliveryId: d.id,
            refundType,
          })),
        }),
      });
      if (!res.ok) throw new Error("Bulk refund failed");
      setSelected(new Set());
      router.refresh();
    } catch {
      // allow retry
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-slate-100 px-5 py-2">
          <select
            value={refundType}
            onChange={(e) =>
              setRefundType(e.target.value as "wrong_filter" | "invalid_phone")
            }
            className="form-select w-44 py-1.5 text-xs"
          >
            <option value="wrong_filter">Type A — Wrong Filter</option>
            <option value="invalid_phone">Type B — Invalid Phone</option>
          </select>
          <button
            type="button"
            disabled={pending || refundableSelected.length === 0}
            onClick={bulkRefund}
            className="btn-primary btn-sm"
          >
            {pending
              ? "Submitting…"
              : `Request Refund (${refundableSelected.length})`}
          </button>
        </div>
      )}
      <table className="data-table">
        <thead>
          <tr>
            <th className="w-8">
              <input
                type="checkbox"
                checked={
                  deliveries.filter((d) => d.canRefund).length > 0 &&
                  selected.size === deliveries.filter((d) => d.canRefund).length
                }
                onChange={toggleAll}
                className="rounded border-slate-300"
              />
            </th>
            <th>Lead</th>
            <th>Contact</th>
            <th>Location</th>
            <th>Type</th>
            <th>Channel</th>
            <th>Price</th>
            <th>Status</th>
            <th>Delivered</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((d) => (
            <tr key={d.id}>
              <td>
                <input
                  type="checkbox"
                  disabled={!d.canRefund}
                  checked={selected.has(d.id)}
                  onChange={() => toggle(d.id)}
                  className="rounded border-slate-300 disabled:opacity-30"
                />
              </td>
              <td>
                <p className="font-medium text-slate-900">
                  {d.lead.firstName} {d.lead.lastName}
                </p>
                <p className="text-xs text-slate-400">{d.lead.email}</p>
              </td>
              <td className="text-slate-500">{d.lead.phone}</td>
              <td>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">
                  {d.lead.state}
                </span>
              </td>
              <td>
                <Badge variant="blue">
                  {d.lead.leadType === "traditional_iul" ? "Trad. IUL" : "High Intent"}
                </Badge>
              </td>
              <td>
                <Badge variant={d.channel === "realtime" ? "green" : "purple"}>
                  {d.channel === "realtime" ? "Real-time" : "Aged"}
                </Badge>
              </td>
              <td className="font-semibold">${d.price.toFixed(2)}</td>
              <td>
                {d.refundedAt ? (
                  <Badge variant="slate">Refunded</Badge>
                ) : d.refundStatus ? (
                  <Badge variant="yellow">Refund {d.refundStatus}</Badge>
                ) : (
                  <Badge variant="green">Active</Badge>
                )}
              </td>
              <td className="text-xs text-slate-400">
                {new Date(d.deliveredAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td>
                <div className="flex items-center justify-end gap-2">
                  {d.lead.trustedformCertUrl && (
                    <a
                      href={d.lead.trustedformCertUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-700 hover:underline"
                      title="TrustedForm"
                    >
                      <ShieldCheck size={14} />
                    </a>
                  )}
                  {d.canRefund && (
                    <PartnerRefundButton leadDeliveryId={d.id} />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
