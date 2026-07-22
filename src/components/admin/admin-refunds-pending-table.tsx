"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefundReviewActions } from "@/components/admin/refund-review-actions";
import { RefundTableFilters } from "@/components/admin/refund-table-filters";
import { ClientTablePagination } from "@/components/ui/table-pagination";
import {
  CLIENT_TABLE_PAGE_SIZE,
  paginateClientList,
} from "@/lib/client-table-pagination";
import { RefundTypeBadge } from "@/components/admin/refund-type-badge";
import {
  matchesRefundTypeFilter,
  toggleRefundTypeFilter,
  type RefundTypeFilter,
} from "@/lib/refunds/constants";
import { formatDateTime } from "@/lib/format-datetime";
import type { RefundLeadSnapshot } from "@/lib/admin/refund-lead-snapshot";
import type { RefundPartnerSnapshot } from "@/lib/admin/refund-partner-snapshot";
import { RefundLeadCell } from "@/components/admin/refund-lead-cell";
import { RefundLeadDetailSheet } from "@/components/admin/refund-lead-detail-sheet";
import { RefundPartnerCell } from "@/components/admin/refund-partner-cell";
import { RefundPartnerDetailSheet } from "@/components/admin/refund-partner-detail-sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type PendingRefund = {
  id: string;
  partner: RefundPartnerSnapshot;
  lead: RefundLeadSnapshot;
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
  const [page, setPage] = useState(1);
  const [partnerSheet, setPartnerSheet] = useState<RefundPartnerSnapshot | null>(
    null,
  );
  const [partnerSheetOpen, setPartnerSheetOpen] = useState(false);
  const [leadSheet, setLeadSheet] = useState<RefundLeadSnapshot | null>(null);
  const [leadSheetOpen, setLeadSheetOpen] = useState(false);

  function openPartnerSheet(partner: RefundPartnerSnapshot) {
    setPartnerSheet(partner);
    setPartnerSheetOpen(true);
  }

  function openLeadSheet(lead: RefundLeadSnapshot) {
    setLeadSheet(lead);
    setLeadSheetOpen(true);
  }

  const counts = useMemo(() => refundTypeCounts(refunds), [refunds]);

  const filteredRefunds = useMemo(
    () => refunds.filter((r) => matchesRefundTypeFilter(r.refundType, typeFilter)),
    [refunds, typeFilter],
  );

  const { pageItems: pageRefunds, page: currentPage } = useMemo(
    () => paginateClientList(filteredRefunds, page, CLIENT_TABLE_PAGE_SIZE),
    [filteredRefunds, page],
  );

  useEffect(() => {
    setPage((p) => {
      const totalPages = Math.max(
        1,
        Math.ceil(filteredRefunds.length / CLIENT_TABLE_PAGE_SIZE),
      );
      return Math.min(p, totalPages);
    });
  }, [filteredRefunds.length]);

  function handleTypeFilterChange(next: RefundTypeFilter) {
    setTypeFilter(next);
    setPage(1);
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
    const pageIds = pageRefunds.map((r) => r.id);
    const allPageSelected =
      pageIds.length > 0 && pageIds.every((id) => selected.has(id));
    if (allPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of pageIds) next.delete(id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of pageIds) next.add(id);
        return next;
      });
    }
  }

  const allOnPageSelected =
    pageRefunds.length > 0 &&
    pageRefunds.every((r) => selected.has(r.id));

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
    <TooltipProvider delayDuration={300}>
      <>
      <RefundTableFilters
        typeValue={typeFilter}
        onTypeChange={handleTypeFilterChange}
        typeCounts={counts}
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
        <>
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-8">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleAll}
                  className="rounded border-slate-300"
                  aria-label="Select all refund requests on this page"
                />
              </th>
              <th>Partner</th>
              <th>Lead</th>
              <th>State</th>
              <th>Type</th>
              <th>Reason</th>
              <th>Amount</th>
              <th>Requested</th>
              <th className="w-12 text-center" />
            </tr>
          </thead>
          <tbody>
            {pageRefunds.map((r) => (
              <tr key={r.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                    className="rounded border-slate-300"
                    aria-label={`Select refund for ${r.lead.name}`}
                  />
                </td>
                <td className="p-0">
                  <RefundPartnerCell
                    partner={r.partner}
                    showEmail
                    onSelect={openPartnerSheet}
                  />
                </td>
                <td className="p-0">
                  <RefundLeadCell lead={r.lead} onSelect={openLeadSheet} />
                </td>
                <td>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">
                    {r.lead.state}
                  </span>
                </td>
                <td>
                  <RefundTypeBadge
                    type={r.refundType}
                    filterActive={typeFilter === r.refundType}
                    onFilterClick={(type) =>
                      handleTypeFilterChange(
                        toggleRefundTypeFilter(typeFilter, type),
                      )
                    }
                  />
                </td>
                <RefundReasonCell reason={r.reason} />
                <td className="font-semibold text-slate-900">
                  ${r.amount.toFixed(2)}
                </td>
                <td className="text-xs text-slate-400" suppressHydrationWarning>
                  {formatDateTime(r.createdAt)}
                </td>
                <td>
                  <RefundReviewActions refundId={r.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <ClientTablePagination
          page={currentPage}
          pageSize={CLIENT_TABLE_PAGE_SIZE}
          total={filteredRefunds.length}
          onPageChange={setPage}
        />
        </>
      )}
      <RefundPartnerDetailSheet
        partner={partnerSheet}
        open={partnerSheetOpen}
        onOpenChange={setPartnerSheetOpen}
      />
      <RefundLeadDetailSheet
        lead={leadSheet}
        open={leadSheetOpen}
        onOpenChange={setLeadSheetOpen}
      />
      </>
    </TooltipProvider>
  );
}

function RefundReasonCell({ reason }: { reason: string | null }) {
  if (!reason) {
    return (
      <td className="max-w-[180px] text-slate-500">—</td>
    );
  }

  return (
    <td className="max-w-[180px] text-slate-500">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="block cursor-default truncate">{reason}</span>
        </TooltipTrigger>
        <TooltipContent side="top">{reason}</TooltipContent>
      </Tooltip>
    </td>
  );
}

