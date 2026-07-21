"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { RefundTypeFilterChips } from "@/components/admin/refund-type-filter-chips";
import {
  matchesRefundTypeFilter,
  type RefundTypeFilter,
} from "@/lib/refunds/constants";
import { formatDateTime } from "@/lib/format-datetime";

type HistoryRefund = {
  id: string;
  partnerName: string;
  leadName: string;
  refundType: string;
  amount: number;
  status: string;
  reviewedAt: string | null;
};

function refundTypeCounts(refunds: HistoryRefund[]) {
  const wrong_filter = refunds.filter((r) => r.refundType === "wrong_filter").length;
  const invalid_phone = refunds.filter((r) => r.refundType === "invalid_phone").length;
  return {
    all: refunds.length,
    wrong_filter,
    invalid_phone,
  };
}

export function AdminRefundsHistoryTable({
  refunds,
}: {
  refunds: HistoryRefund[];
}) {
  const [typeFilter, setTypeFilter] = useState<RefundTypeFilter>("all");
  const counts = useMemo(() => refundTypeCounts(refunds), [refunds]);
  const filteredRefunds = useMemo(
    () => refunds.filter((r) => matchesRefundTypeFilter(r.refundType, typeFilter)),
    [refunds, typeFilter],
  );

  if (refunds.length === 0) return null;

  return (
    <>
      <RefundTypeFilterChips
        value={typeFilter}
        onChange={setTypeFilter}
        counts={counts}
      />
      {filteredRefunds.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500">
          No history entries match this type.{" "}
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            className="font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded-sm"
          >
            Show all
          </button>
        </p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Partner</th>
              <th>Lead</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Decision</th>
              <th>Reviewed</th>
            </tr>
          </thead>
          <tbody>
            {filteredRefunds.map((r) => (
              <tr key={r.id}>
                <td className="font-medium text-slate-900">{r.partnerName}</td>
                <td>{r.leadName}</td>
                <td>
                  <RefundTypeBadge type={r.refundType} />
                </td>
                <td className="font-semibold">${r.amount.toFixed(2)}</td>
                <td>
                  <Badge variant={r.status === "approved" ? "green" : "red"}>
                    {r.status === "approved" ? "Approved" : "Rejected"}
                  </Badge>
                </td>
                <td className="text-xs text-slate-400" suppressHydrationWarning>
                  {formatDateTime(r.reviewedAt)}
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
