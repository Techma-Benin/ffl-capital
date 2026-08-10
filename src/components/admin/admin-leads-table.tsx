"use client";

import { useCallback, useState } from "react";
import { PortalAnchoredMenuContent } from "@/components/ui/portal-anchored-menu-content";
import { usePortalAnchoredMenu } from "@/hooks/use-portal-anchored-menu";
import { useNavigateWithPending } from "@/hooks/use-navigate-with-pending";
import { LeadCategoryBadge } from "@/components/leads/lead-category-badge";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import {
  PortalDataTable,
  portalTableCell,
  portalTableCellFirst,
  portalTableCellLast,
  portalTableDataCellClassName,
  portalTableRowClassName,
  portalRowActionsCellClassName,
  portalRowKebabTriggerClassName,
  type PortalDataTableLayout,
} from "@/components/ui/portal-data-table";
import { formatDateTime } from "@/lib/format-datetime";
import { moneyCellClass } from "@/lib/format-money";
import { formatIntegrityEndpointPartnerLabel } from "@/lib/leads/lead-status-label";
import type { PortalDataTableColumn } from "@/components/ui/portal-data-table";
import {
  ArrowsClockwise,
  ArrowUpRight,
  DotsThreeVertical,
  Eye,
  ICON_WEIGHT_LINEAR,
} from "@/lib/icons/client";

type LeadRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  state: string;
  leadType: string;
  leadTypeLabel: string;
  status: string;
  liveSaleChannel: string | null;
  available: boolean;
  receivedAt: Date;
  trustedformCertUrl: string | null;
  partnerName: string | null;
  price: string | null;
};

function isEligibleForReprocess(lead: LeadRow): boolean {
  return lead.status === "unmatched" && lead.available;
}

function adminLeadHasExtraRowActions(lead: LeadRow): boolean {
  return !!lead.trustedformCertUrl || isEligibleForReprocess(lead);
}

function AdminLeadRowMenu({
  lead,
  layout,
  onReprocessLead,
}: {
  lead: LeadRow;
  layout: PortalDataTableLayout;
  onReprocessLead?: (leadId: string) => void | Promise<void>;
}) {
  const { push } = useNavigateWithPending();
  const [open, setOpen] = useState(false);
  const [reprocessPending, setReprocessPending] = useState(false);
  const closeMenu = useCallback(() => setOpen(false), []);

  const canReprocess = isEligibleForReprocess(lead);
  const menuItemCount =
    1 + (lead.trustedformCertUrl ? 1 : 0) + (canReprocess ? 1 : 0);
  const { buttonRef, menuRef, menuStyle } = usePortalAnchoredMenu({
    open,
    onClose: closeMenu,
    estimatedMenuWidth: 176,
    estimatedMenuHeight: menuItemCount * 40 + 12,
    repositionKey: `${menuItemCount}-${reprocessPending}`,
  });

  async function handleReprocess() {
    if (!onReprocessLead) return;
    setReprocessPending(true);
    try {
      await onReprocessLead(lead.id);
      setOpen(false);
    } catch {
      // allow retry
    } finally {
      setReprocessPending(false);
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={portalRowKebabTriggerClassName(layout, { revealed: open })}
        aria-label="Lead actions"
        aria-expanded={open}
      >
        <DotsThreeVertical size={18} weight={ICON_WEIGHT_LINEAR} />
      </button>

      <PortalAnchoredMenuContent
        open={open}
        menuRef={menuRef}
        menuStyle={menuStyle}
        className="fixed z-50 w-44 rounded-xl border border-slate-100 bg-white py-1.5 shadow-lg"
      >
        <button
          type="button"
          className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          onClick={() => {
            setOpen(false);
            push(`/admin/leads/${lead.id}`);
          }}
        >
          <Eye size={14} className="text-slate-400" />
          View lead
        </button>

        {lead.trustedformCertUrl && (
          <a
            href={lead.trustedformCertUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            onClick={() => setOpen(false)}
          >
            <ArrowUpRight size={14} className="text-slate-400" />
            TrustedForm cert
          </a>
        )}

        {canReprocess && (
          <button
            type="button"
            disabled={reprocessPending}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-brand-700 hover:bg-brand-50 transition-colors disabled:opacity-50"
            onClick={handleReprocess}
          >
            <ArrowsClockwise
              size={14}
              className={`text-brand-600 ${reprocessPending ? "animate-spin" : ""}`}
            />
            {reprocessPending ? "Processing…" : "Reprocess"}
          </button>
        )}
      </PortalAnchoredMenuContent>
    </>
  );
}

export function AdminLeadsTable({
  leads,
  columns,
  sort,
  layout = "cards",
  tableFooter,
  selectedIds,
  onSelectedChange,
  onReprocessLead,
}: {
  leads: LeadRow[];
  columns: PortalDataTableColumn[];
  sort?: {
    active?: string;
    dir: "asc" | "desc";
    hrefBySortKey: Record<string, string>;
  };
  layout?: PortalDataTableLayout;
  tableFooter?: React.ReactNode;
  selectedIds: Set<string>;
  onSelectedChange: (ids: Set<string>) => void;
  onReprocessLead?: (leadId: string) => void | Promise<void>;
}) {
  const eligibleLeads = leads.filter(isEligibleForReprocess);
  const eligibleIds = new Set(eligibleLeads.map((l) => l.id));

  const allEligibleSelected =
    eligibleLeads.length > 0 &&
    eligibleLeads.every((l) => selectedIds.has(l.id));

  function toggleAll() {
    if (allEligibleSelected) {
      onSelectedChange(new Set());
    } else {
      onSelectedChange(new Set(eligibleLeads.map((l) => l.id)));
    }
  }

  function toggleRow(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectedChange(next);
  }

  // Build the checkbox column with header content
  const checkboxHeaderContent =
    eligibleLeads.length > 0 ? (
      <input
        type="checkbox"
        aria-label="Select all eligible leads"
        checked={allEligibleSelected}
        onChange={toggleAll}
        className="h-4 w-4 rounded border-slate-300 text-brand-600 accent-brand-600 cursor-pointer"
      />
    ) : null;

  // Prepend a checkbox column to the display columns
  const checkboxCol: PortalDataTableColumn = {
    key: "_checkbox",
    label: "",
    headerContent: checkboxHeaderContent,
  };
  const displayColumns = [checkboxCol, ...columns];

  function cellClass(
    options: { first?: boolean; last?: boolean; className?: string } = {},
  ) {
    return (
      portalTableDataCellClassName(layout, options) ??
      options.className ??
      portalTableCell
    );
  }

  function cell(key: string, lead: LeadRow, index: number, total: number) {
    const first = index === 0;
    const last = index === total - 1;
    switch (key) {
      case "_checkbox": {
        const eligible = isEligibleForReprocess(lead);
        return (
          <td
            key={key}
            className={cellClass({ first, last, className: "w-8" })}
            onClick={(e) => e.stopPropagation()}
          >
            {eligible && (
              <input
                type="checkbox"
                aria-label="Select lead"
                checked={selectedIds.has(lead.id)}
                onChange={() => toggleRow(lead.id)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 accent-brand-600 cursor-pointer"
              />
            )}
          </td>
        );
      }
      case "id":
        return (
          <td
            key={key}
            className={cellClass({
              first,
              last,
              className: "font-mono text-xs text-slate-400",
            })}
          >
            {lead.id.slice(0, 8)}…
          </td>
        );
      case "name":
        return (
          <td key={key} className={cellClass({ first, last })}>
            <p className="font-medium text-slate-900">
              {lead.firstName} {lead.lastName}
            </p>
            <p className="text-xs text-slate-400">{lead.email}</p>
          </td>
        );
      case "phone":
        return (
          <td
            key={key}
            className={cellClass({ first, last, className: "text-slate-500" })}
          >
            {lead.phone}
          </td>
        );
      case "state":
        return (
          <td key={key} className={cellClass({ first, last })}>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">
              {lead.state}
            </span>
          </td>
        );
      case "type":
        return (
          <td key={key} className={cellClass({ first, last })}>
            <LeadCategoryBadge leadType={lead.leadType || null}>
              {lead.leadTypeLabel}
            </LeadCategoryBadge>
          </td>
        );
      case "status":
        return (
          <td key={key} className={cellClass({ first, last })}>
            <LeadStatusBadge status={lead.status} />
          </td>
        );
      case "partner": {
        const integrityEndpoint = formatIntegrityEndpointPartnerLabel(
          lead.liveSaleChannel,
        );
        return (
          <td
            key={key}
            className={cellClass({ first, last, className: "text-slate-600" })}
          >
            {integrityEndpoint ??
              lead.partnerName ?? <span className="text-slate-300">—</span>}
          </td>
        );
      }
      case "price":
        return (
          <td
            key={key}
            className={cellClass({
              first,
              last,
              className: moneyCellClass("font-semibold text-slate-700"),
            })}
          >
            {lead.price ?? <span className="text-slate-300">—</span>}
          </td>
        );
      case "received":
        return (
          <td
            key={key}
            className={cellClass({
              first,
              last,
              className: "text-slate-400 text-xs",
            })}
            suppressHydrationWarning
          >
            {formatDateTime(lead.receivedAt)}
          </td>
        );
      case "trustedform":
        return (
          <td key={key} className={cellClass({ first, last })}>
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
          <td
            key={key}
            className={portalRowActionsCellClassName(
              layout,
              cellClass({ first, last }),
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {adminLeadHasExtraRowActions(lead) ? (
              <AdminLeadRowMenu
                lead={lead}
                layout={layout}
                onReprocessLead={onReprocessLead}
              />
            ) : null}
          </td>
        );
      default:
        return null;
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <PortalDataTable
        columns={displayColumns}
        sort={sort}
        layout={layout}
        footer={tableFooter}
      >
        {leads.map((lead) => (
          <tr
            key={lead.id}
            className={`cursor-pointer ${portalTableRowClassName(undefined, layout)}`}
            onClick={() => {
              window.location.href = `/admin/leads/${lead.id}`;
            }}
          >
            {displayColumns.map((c, i) =>
              cell(c.key, lead, i, displayColumns.length),
            )}
          </tr>
        ))}
      </PortalDataTable>
    </div>
  );
}
