"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { LeadCategoryBadge } from "@/components/leads/lead-category-badge";
import {
  PortalSortableHeaderCell,
  PortalTableHeaderCell,
  type SortDirection,
} from "@/components/ui/portal-sortable-table-header";
import { formatUsd, moneyCellClass, moneyHeaderClassName } from "@/lib/format-money";
import type { AdminAgedLeadSortKey } from "@/lib/admin/admin-aged-leads-sort";
import {
  leadPreviewFromRefundSnapshot,
  type RefundLeadSnapshot,
} from "@/lib/admin/refund-lead-snapshot";
import { AdminAgedLeadRowActions } from "@/components/admin/admin-aged-lead-row-actions";
import { LeadPreviewSheet } from "@/components/leads/lead-preview-sheet";
import type { LeadPreviewModel } from "@/lib/leads/lead-preview";

export type AdminAgedLeadRow = {
  id: string;
  firstName: string;
  lastName: string;
  state: string;
  leadType: string;
  leadTypeLabel: string;
  status: string;
  ageDays: number;
  price: number;
  sheetLead: RefundLeadSnapshot;
};

const COLUMNS: {
  key: AdminAgedLeadSortKey | "actions";
  label: string;
  sortKey?: AdminAgedLeadSortKey;
  headerClassName?: string;
}[] = [
  { key: "name", label: "Name", sortKey: "name" },
  { key: "state", label: "State", sortKey: "state" },
  { key: "type", label: "Type", sortKey: "type" },
  { key: "status", label: "Status", sortKey: "status" },
  { key: "ageDays", label: "Age (days)", sortKey: "ageDays" },
  { key: "price", label: "Price", sortKey: "price", headerClassName: moneyHeaderClassName },
  { key: "actions", label: "" },
];

export function AdminAgedLeadsTable({
  leads,
  sort,
  dir,
  hrefBySortKey,
  agedDaysMin = 30,
}: {
  leads: AdminAgedLeadRow[];
  sort: AdminAgedLeadSortKey;
  dir: SortDirection;
  hrefBySortKey: Record<AdminAgedLeadSortKey, string>;
  agedDaysMin?: number;
}) {
  const [leadSheet, setLeadSheet] = useState<LeadPreviewModel | null>(null);
  const [leadSheetOpen, setLeadSheetOpen] = useState(false);

  function openLeadSheet(lead: RefundLeadSnapshot) {
    setLeadSheet(leadPreviewFromRefundSnapshot(lead));
    setLeadSheetOpen(true);
  }

  return (
    <>
      <table className="data-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => {
              if (col.sortKey) {
                return (
                  <PortalSortableHeaderCell
                    key={col.key}
                    label={col.label}
                    href={hrefBySortKey[col.sortKey]}
                    active={sort === col.sortKey}
                    dir={sort === col.sortKey ? dir : "asc"}
                    headerClassName={clsx("!px-3 !py-2", col.headerClassName)}
                  />
                );
              }
              return (
                <PortalTableHeaderCell
                  key={col.key}
                  label={col.label}
                  headerClassName="!px-3 !py-2 w-px"
                />
              );
            })}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.id}
              className="group cursor-pointer"
              onClick={() => openLeadSheet(lead.sheetLead)}
            >
              <td>
                <span className="font-medium text-slate-900">
                  {lead.firstName} {lead.lastName}
                </span>
              </td>
              <td>{lead.state}</td>
              <td>
                <LeadCategoryBadge leadType={lead.leadType || null}>
                  {lead.leadTypeLabel}
                </LeadCategoryBadge>
              </td>
              <td className="capitalize">{lead.status.replace("_", " ")}</td>
              <td>{lead.ageDays}d</td>
              <td className={moneyCellClass("font-semibold")}>{formatUsd(lead.price)}</td>
              <td className="text-right" onClick={(e) => e.stopPropagation()}>
                <AdminAgedLeadRowActions leadId={lead.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <LeadPreviewSheet
        lead={leadSheet}
        open={leadSheetOpen}
        onOpenChange={setLeadSheetOpen}
        title="Lead"
        agedDaysMin={agedDaysMin}
        showViewFullLead
      />
    </>
  );
}
