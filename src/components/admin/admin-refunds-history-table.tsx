"use client";

import { useEffect, useMemo, useState } from "react";
import { RefundTableFilters } from "@/components/admin/refund-table-filters";
import { RefundDecisionBadge } from "@/components/admin/refund-decision-badge";
import { ClientTablePagination } from "@/components/ui/table-pagination";
import {
  CLIENT_TABLE_PAGE_SIZE,
  paginateClientList,
} from "@/lib/client-table-pagination";
import { RefundTypeBadge } from "@/components/admin/refund-type-badge";
import {
  matchesRefundDecisionFilter,
  matchesRefundTypeFilter,
  toggleRefundDecisionFilter,
  toggleRefundTypeFilter,
  type RefundDecisionFilter,
  type RefundTypeFilter,
} from "@/lib/refunds/constants";
import { formatDateTime } from "@/lib/format-datetime";
import type { RefundLeadSnapshot } from "@/lib/admin/refund-lead-snapshot";
import type { RefundPartnerSnapshot } from "@/lib/admin/refund-partner-snapshot";
import { RefundLeadCell } from "@/components/admin/refund-lead-cell";
import { RefundLeadDetailSheet } from "@/components/admin/refund-lead-detail-sheet";
import { RefundPartnerCell } from "@/components/admin/refund-partner-cell";
import { RefundPartnerDetailSheet } from "@/components/admin/refund-partner-detail-sheet";

type HistoryRefund = {
  id: string;
  partner: RefundPartnerSnapshot;
  lead: RefundLeadSnapshot;
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

function refundDecisionCounts(refunds: HistoryRefund[]) {
  const approved = refunds.filter((r) => r.status === "approved").length;
  const rejected = refunds.filter((r) => r.status === "rejected").length;
  return {
    all: refunds.length,
    approved,
    rejected,
  };
}

export function AdminRefundsHistoryTable({
  refunds,
}: {
  refunds: HistoryRefund[];
}) {
  const [typeFilter, setTypeFilter] = useState<RefundTypeFilter>("all");
  const [decisionFilter, setDecisionFilter] =
    useState<RefundDecisionFilter>("all");
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
  const typeCounts = useMemo(() => refundTypeCounts(refunds), [refunds]);
  const decisionCounts = useMemo(
    () => refundDecisionCounts(refunds),
    [refunds],
  );
  const filteredRefunds = useMemo(
    () =>
      refunds.filter(
        (r) =>
          matchesRefundTypeFilter(r.refundType, typeFilter) &&
          matchesRefundDecisionFilter(r.status, decisionFilter),
      ),
    [refunds, typeFilter, decisionFilter],
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
  }

  function handleDecisionFilterChange(next: RefundDecisionFilter) {
    setDecisionFilter(next);
    setPage(1);
  }

  function clearFilters() {
    setTypeFilter("all");
    setDecisionFilter("all");
    setPage(1);
  }

  if (refunds.length === 0) return null;

  return (
    <>
      <RefundTableFilters
        mode="history"
        typeValue={typeFilter}
        onTypeChange={handleTypeFilterChange}
        typeCounts={typeCounts}
        showDecision
        decisionValue={decisionFilter}
        onDecisionChange={handleDecisionFilterChange}
        decisionCounts={decisionCounts}
      />
      {filteredRefunds.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500">
          No history entries match these filters.{" "}
          <button
            type="button"
            onClick={clearFilters}
            className="font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded-sm"
          >
            Show all
          </button>
        </p>
      ) : (
        <>
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
            {pageRefunds.map((r) => (
              <tr key={r.id}>
                <td className="p-0">
                  <RefundPartnerCell
                    partner={r.partner}
                    variant="compact"
                    onSelect={openPartnerSheet}
                  />
                </td>
                <td className="p-0">
                  <RefundLeadCell
                    lead={r.lead}
                    variant="compact"
                    onSelect={openLeadSheet}
                  />
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
                <td className="font-semibold">${r.amount.toFixed(2)}</td>
                <td>
                  <RefundDecisionBadge
                    decision={r.status}
                    filterActive={decisionFilter === r.status}
                    onFilterClick={(decision) =>
                      handleDecisionFilterChange(
                        toggleRefundDecisionFilter(decisionFilter, decision),
                      )
                    }
                  />
                </td>
                <td className="text-xs text-slate-400" suppressHydrationWarning>
                  {formatDateTime(r.reviewedAt)}
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
  );
}

