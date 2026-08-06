"use client";

import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminRefundsPendingTable } from "@/components/admin/admin-refunds-pending-table";
import { AdminRefundsHistoryTable } from "@/components/admin/admin-refunds-history-table";
import { ArrowCounterClockwise, Clock, Phone } from "@/lib/icons/client";
import { StatCard } from "@/components/ui/stat-card";
import { ClientStoreKeys, useClientResource } from "@/lib/client-store";
import type { RefundLeadSnapshot } from "@/lib/admin/refund-lead-snapshot";
import type { RefundPartnerSnapshot } from "@/lib/admin/refund-partner-snapshot";

export type AdminRefundsPendingRow = {
  id: string;
  partner: RefundPartnerSnapshot;
  lead: RefundLeadSnapshot;
  refundType: string;
  reason: string | null;
  amount: number;
  createdAt: string;
};

export type AdminRefundsHistoryRow = {
  id: string;
  partner: RefundPartnerSnapshot;
  lead: RefundLeadSnapshot;
  refundType: string;
  amount: number;
  status: string;
  reviewedAt: string | null;
};

export type AdminRefundsStorePayload = {
  pending: AdminRefundsPendingRow[];
  history: AdminRefundsHistoryRow[];
};

export function AdminRefundsView({
  initial,
}: {
  initial: AdminRefundsStorePayload;
}) {
  const { data } = useClientResource<AdminRefundsStorePayload>(
    ClientStoreKeys.adminRefunds,
    { initialData: initial },
  );
  const pending = data?.pending ?? initial.pending;
  const history = data?.history ?? initial.history;
  const typeBCount = pending.filter((r) => r.refundType === "invalid_phone").length;

  return (
    <div>
      <PageHeader
        title="Refunds"
        subtitle="Review and approve partner refund requests"
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <StatCard label="Pending" value={pending.length} icon={Clock} accent="orange" />
        <StatCard
          label="Invalid Phone"
          value={typeBCount}
          icon={Phone}
          accent="pink"
          valueClassName="text-red-600"
        />
      </div>

      <div className="card mb-6">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Pending Requests</h2>
        </div>

        <div className="overflow-x-auto">
          {pending.length === 0 ? (
            <EmptyState
              icon={ArrowCounterClockwise}
              title="No pending refund requests"
              description="Refund requests from partners will appear here for review."
              accent="orange"
            />
          ) : (
            <AdminRefundsPendingTable refunds={pending} />
          )}
        </div>
      </div>

      {history.length > 0 && (
        <div className="card">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Recent History</h2>
          </div>
          <div className="overflow-x-auto">
            <AdminRefundsHistoryTable refunds={history} />
          </div>
        </div>
      )}
    </div>
  );
}
