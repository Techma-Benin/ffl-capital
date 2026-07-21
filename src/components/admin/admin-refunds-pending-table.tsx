"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { RefundReviewActions } from "@/components/admin/refund-review-actions";
import { RefundTypeFilterChips } from "@/components/admin/refund-type-filter-chips";
import {
  matchesRefundTypeFilter,
  type RefundTypeFilter,
} from "@/lib/refunds/constants";

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

function refundTypeCounts(refunds: PendingRefund[]) {
  const wrong_filter = refunds.filter((r) => r.refundType === "wrong_filter").length;
  const invalid_phone = refunds.filter((r) => r.refundType === "invalid_phone").length;
  return {
    all: refunds.length,
    wrong_filter,
    invalid_phone,
  };
}

export function AdminRefundsPendingTable({
  refunds,
}: {
  refunds: PendingRefund[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [typeFilter, setTypeFilter] = useState<RefundTypeFilter>("all");

  const counts = useMemo(() => refundTypeCounts(refunds), [refunds]);

  const filteredRefunds = useMemo(
    () => refunds.filter((r) => matchesRefundTypeFilter(r.refundType, typeFilter)),
    [refunds, typeFilter],
  );

  function handleTypeFilterChange(next: RefundTypeFilter) {
    setTypeFilter(next);
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(
        refunds
          .filter((r) => matchesRefundTypeFilter(r.refundType, next))
          .map((r) => r.id),
      );
      const nextSelected = new Set(
        Array.from(prev).filter((id) => visible.has(id)),
      );
      return nextSelected.size === prev.size ? prev : nextSelected;
    });
  }

  function toggleAll() {
    if (selected.size === filteredRefunds.length && filteredRefunds.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredRefunds.map((r) => r.id)));
    }
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
      <RefundTypeFilterChips
        value={typeFilter}
        onChange={handleTypeFilterChange}
        counts={counts}
      />
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
      {filteredRefunds.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500">
          No pending requests match this type. Choose another filter or{" "}
          <button
            type="button"
            onClick={() => handleTypeFilterChange("all")}
            className="font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded-sm"
          >
            show all
          </button>
          .
        </p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-8">
                <input
                  type="checkbox"
                  checked={
                    filteredRefunds.length > 0 &&
                    selected.size === filteredRefunds.length
                  }
                  onChange={toggleAll}
                  className="rounded border-slate-300"
                  aria-label="Select all visible refund requests"
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
            {filteredRefunds.map((r) => (
              <tr key={r.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                    className="rounded border-slate-300"
                    aria-label={`Select refund for ${r.leadName}`}
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
                <td className="font-semibold text-slate-900">
                  ${r.amount.toFixed(2)}
                </td>
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
      )}
    </>
  );
}

function RefundTypeBadge({ type }: { type: string }) {
  if (type === "wrong_filter") {
    return <Badge variant="yellow">Wrong Filter</Badge>;
  }
  return <Badge variant="red">Invalid Phone</Badge>;
}
