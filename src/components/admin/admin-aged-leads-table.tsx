"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  PortalSortableHeaderCell,
  PortalTableHeaderCell,
  type SortDirection,
} from "@/components/ui/portal-sortable-table-header";
import { formatUsd } from "@/lib/format-money";
import type { AdminAgedLeadSortKey } from "@/lib/admin/admin-aged-leads-sort";
import { AdminAgedLeadRowActions } from "@/components/admin/admin-aged-lead-row-actions";

export type AdminAgedLeadRow = {
  id: string;
  firstName: string;
  lastName: string;
  state: string;
  leadType: string;
  status: string;
  ageDays: number;
};

const COLUMNS: {
  key: AdminAgedLeadSortKey | "actions";
  label: string;
  sortKey?: AdminAgedLeadSortKey;
}[] = [
  { key: "name", label: "Name", sortKey: "name" },
  { key: "state", label: "State", sortKey: "state" },
  { key: "type", label: "Type", sortKey: "type" },
  { key: "status", label: "Status", sortKey: "status" },
  { key: "ageDays", label: "Age (days)", sortKey: "ageDays" },
  { key: "price", label: "Price", sortKey: "price" },
  { key: "actions", label: "" },
];

export function AdminAgedLeadsTable({
  leads,
  agedPrice,
  sort,
  dir,
  hrefBySortKey,
}: {
  leads: AdminAgedLeadRow[];
  agedPrice: number;
  sort: AdminAgedLeadSortKey;
  dir: SortDirection;
  hrefBySortKey: Record<AdminAgedLeadSortKey, string>;
}) {
  return (
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
                  headerClassName="!px-3 !py-2"
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
          <tr key={lead.id} className="group">
            <td>
              <Link
                href={`/admin/leads/${lead.id}`}
                className="font-medium hover:text-brand-600"
              >
                {lead.firstName} {lead.lastName}
              </Link>
            </td>
            <td>{lead.state}</td>
            <td>
              <Badge variant="blue">
                {lead.leadType === "traditional_iul" ? "Trad. IUL" : "High Intent"}
              </Badge>
            </td>
            <td className="capitalize">{lead.status.replace("_", " ")}</td>
            <td>{lead.ageDays}d</td>
            <td className="font-semibold">{formatUsd(agedPrice)}</td>
            <td className="text-right">
              <AdminAgedLeadRowActions leadId={lead.id} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
