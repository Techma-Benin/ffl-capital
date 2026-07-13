"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { RefundReviewActions } from "@/components/admin/refund-review-actions";

type PendingRefund = {
  id: string;
  partnerName: string;
  partnerEmail: string;
  leadName: string;
  state: string;
  refundType: string;
  reason: string | null;
  amount: number;
  createdAt: string;
};

export function AdminRefundsPendingTable({
  refunds,
}: {
  refunds: PendingRefund[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);

  function toggleAll() {
    if (selected.size === refunds.length) setSelected(new Set());
    else setSelected(new Set(refunds.map((r) => r.id)));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkApprove() {
    if (selected.size === 0) return;
    setPending(true);
    try {
      const res = await fetch("/api/admin/refunds/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundRequestIds: Array.from(selected) }),
      });
      if (!res.ok) throw new Error("Bulk approve failed");
      setSelected(new Set());
      router.refresh();
    } catch {
      // allow retry
    } finally {
      setPending(false);
    }
  }

  if (refunds.length === 0) return null;

  return (
    <>
      {selected.size > 0 && (
        <div className="flex items-center justify-end gap-2 border-b border-slate-100 px-5 py-2">
          <button
            type="button"
            disabled={pending}
            onClick={bulkApprove}
            className="btn-primary btn-sm"
          >
            {pending ? "Approving…" : `Approve Selected (${selected.size})`}
          </button>
        </div>
      )}
      <table className="data-table">
        <thead>
          <tr>
            <th className="w-8">
              <input
                type="checkbox"
                checked={selected.size === refunds.length}
                onChange={toggleAll}
                className="rounded border-slate-300"
              />
            </th>
            <th>Partner</th>
            <th>Lead</th>
            <th>State</th>
            <th>Type</th>
            <th>Reason</th>
            <th>Amount</th>
            <th>Requested</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {refunds.map((r) => (
            <tr key={r.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={() => toggle(r.id)}
                  className="rounded border-slate-300"
                />
              </td>
              <td>
                <p className="font-medium text-slate-900">{r.partnerName}</p>
                <p className="text-xs text-slate-400">{r.partnerEmail}</p>
              </td>
              <td className="font-medium text-slate-900">{r.leadName}</td>
              <td>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">
                  {r.state}
                </span>
              </td>
              <td>
                <RefundTypeBadge type={r.refundType} />
              </td>
              <td className="max-w-[180px] truncate text-slate-500">
                {r.reason ?? "—"}
              </td>
              <td className="font-semibold text-slate-900">${r.amount.toFixed(2)}</td>
              <td className="text-xs text-slate-400">
                {new Date(r.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </td>
              <td>
                <RefundReviewActions refundId={r.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function RefundTypeBadge({ type }: { type: string }) {
  if (type === "wrong_filter") {
    return <Badge variant="yellow">Type A — Wrong Filter</Badge>;
  }
  return <Badge variant="red">Type B — Invalid Phone</Badge>;
}
