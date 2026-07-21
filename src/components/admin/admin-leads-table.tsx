"use client";

import { Badge } from "@/components/ui/badge";
import { LeadReprocessButton } from "@/components/admin/lead-reprocess-button";
import {
  PortalDataTable,
  portalTableCell,
  portalTableCellFirst,
  portalTableCellLast,
  portalTableRowClassName,
} from "@/components/ui/portal-data-table";
import { formatDateTime } from "@/lib/format-datetime";
import type { PortalDataTableColumn } from "@/components/ui/portal-data-table";

type LeadRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  state: string;
  leadType: string;
  status: string;
  available: boolean;
  receivedAt: Date;
  trustedformCertUrl: string | null;
  partnerName: string | null;
  price: string | null;
};

export function AdminLeadsTable({
  leads,
  columns,
  sort,
}: {
  leads: LeadRow[];
  columns: PortalDataTableColumn[];
  sort?: {
    active?: string;
    dir: "asc" | "desc";
    hrefBySortKey: Record<string, string>;
  };
}) {
  const visibleKeys = new Set(columns.map((c) => c.key));

  function cell(key: string, lead: LeadRow) {
    switch (key) {
      case "id":
        return (
          <td key={key} className={`font-mono text-xs text-slate-400 ${portalTableCellFirst}`}>
            {lead.id.slice(0, 8)}…
          </td>
        );
      case "name":
        return (
          <td key={key} className={portalTableCell}>
            <p className="font-medium text-slate-900">
              {lead.firstName} {lead.lastName}
            </p>
            <p className="text-xs text-slate-400">{lead.email}</p>
          </td>
        );
      case "phone":
        return (
          <td key={key} className={`text-slate-500 ${portalTableCell}`}>
            {lead.phone}
          </td>
        );
      case "state":
        return (
          <td key={key} className={portalTableCell}>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">
              {lead.state}
            </span>
          </td>
        );
      case "type":
        return (
          <td key={key} className={portalTableCell}>
            <Badge variant="purple">
              {lead.leadType === "traditional_iul" ? "Trad. IUL" : "High Intent"}
            </Badge>
          </td>
        );
      case "status":
        return (
          <td key={key} className={portalTableCell}>
            <LeadStatusBadge status={lead.status} />
          </td>
        );
      case "partner":
        return (
          <td key={key} className={`text-slate-600 ${portalTableCell}`}>
            {lead.partnerName ?? <span className="text-slate-300">—</span>}
          </td>
        );
      case "price":
        return (
          <td key={key} className={`font-semibold text-slate-700 ${portalTableCell}`}>
            {lead.price ?? <span className="text-slate-300">—</span>}
          </td>
        );
      case "received":
        return (
          <td
            key={key}
            className={`text-slate-400 text-xs ${portalTableCell}`}
            suppressHydrationWarning
          >
            {formatDateTime(lead.receivedAt)}
          </td>
        );
      case "trustedform":
        return (
          <td key={key} className={portalTableCell}>
            {lead.trustedformCertUrl ? (
              <a
                href={lead.trustedformCertUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-orange-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                View cert
              </a>
            ) : (
              <span className="text-xs text-slate-300">—</span>
            )}
          </td>
        );
      case "actions":
        return (
          <td key={key} className={`text-right ${portalTableCellLast}`}>
            <div className="flex justify-end">
              {lead.status === "unmatched" && lead.available && (
                <LeadReprocessButton leadId={lead.id} />
              )}
            </div>
          </td>
        );
      default:
        return null;
    }
  }

  return (
    <PortalDataTable columns={columns} sort={sort}>
      {leads.map((lead) => (
        <tr
          key={lead.id}
          className={`cursor-pointer ${portalTableRowClassName()}`}
          onClick={() => {
            window.location.href = `/admin/leads/${lead.id}`;
          }}
        >
          {columns
            .filter((c) => visibleKeys.has(c.key))
            .map((c) => cell(c.key, lead))}
        </tr>
      ))}
    </PortalDataTable>
  );
}

function LeadStatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { variant: "green" | "yellow" | "red" | "blue" | "slate"; label: string }
  > = {
    delivered: { variant: "green", label: "Delivered" },
    unmatched: { variant: "yellow", label: "Unmatched" },
    integrity_posted: { variant: "blue", label: "Integrity" },
    aged_listed: { variant: "slate", label: "Aged" },
    dead: { variant: "red", label: "Dead" },
  };
  const c = config[status] ?? { variant: "slate" as const, label: status };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
