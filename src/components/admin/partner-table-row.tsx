"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigateWithPending } from "@/hooks/use-navigate-with-pending";
import { Badge } from "@/components/ui/badge";
import {
  portalTableDataCellClassName,
  portalTableRowClassName,
  PortalTablePrimaryCell,
  portalRowActionsCellClassName,
  portalRowKebabTriggerClassName,
  type PortalDataTableLayout,
} from "@/components/ui/portal-data-table";
import {
  defaultPartnersColumnVisibility,
  type PartnersColumnVisibilityState,
} from "@/lib/admin/partners-table-columns";
import { clsx } from "clsx";
import { formatUsd, moneyCellClass } from "@/lib/format-money";
import {
  CheckCircle,
  Prohibit,
  Lightning,
  Trash,
  DotsThreeVertical,
  ICON_WEIGHT_LINEAR,
} from "@/lib/icons/client";
import { PartnerAvatar } from "@/components/admin/partner-avatar";
import { ClientStoreKeys, clientStore } from "@/lib/client-store";

type Partner = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  affiliation: string | null;
  status: string;
  priority: number;
  walletBalance: number | string;
  leadBuying: boolean;
  walletOk: boolean;
  leadsCount: number;
  avatarUrl?: string | null;
};

type ActionKey = "approve" | "block" | "activate" | "delete";

type ActionDef = {
  key: ActionKey;
  label: string;
  icon: React.ReactNode;
  menuClass: string;
};

const actionMap: Record<string, ActionDef[]> = {
  pending_approval: [
    {
      key: "approve",
      label: "Approve",
      icon: <CheckCircle size={14} className="text-emerald-500" weight={ICON_WEIGHT_LINEAR} />,
      menuClass: "text-emerald-700 hover:bg-emerald-50",
    },
    {
      key: "block",
      label: "Block",
      icon: <Prohibit size={14} className="text-red-400" weight={ICON_WEIGHT_LINEAR} />,
      menuClass: "text-red-700 hover:bg-red-50",
    },
  ],
  active: [
    {
      key: "block",
      label: "Block",
      icon: <Prohibit size={14} className="text-red-400" weight={ICON_WEIGHT_LINEAR} />,
      menuClass: "text-red-700 hover:bg-red-50",
    },
  ],
  disabled: [
    {
      key: "activate",
      label: "Activate",
      icon: <Lightning size={14} className="text-emerald-500" weight={ICON_WEIGHT_LINEAR} />,
      menuClass: "text-emerald-700 hover:bg-emerald-50",
    },
    {
      key: "delete",
      label: "Delete",
      icon: <Trash size={14} className="text-red-400" weight={ICON_WEIGHT_LINEAR} />,
      menuClass: "text-red-700 hover:bg-red-50",
    },
  ],
  rejected: [
    {
      key: "activate",
      label: "Activate",
      icon: <Lightning size={14} className="text-emerald-500" weight={ICON_WEIGHT_LINEAR} />,
      menuClass: "text-emerald-700 hover:bg-emerald-50",
    },
    {
      key: "delete",
      label: "Delete",
      icon: <Trash size={14} className="text-red-400" weight={ICON_WEIGHT_LINEAR} />,
      menuClass: "text-red-700 hover:bg-red-50",
    },
  ],
};

const statusBadgeVariant: Record<string, "green" | "yellow" | "red" | "slate"> = {
  active: "green",
  pending_approval: "yellow",
  rejected: "red",
  disabled: "slate",
};

const statusLabel: Record<string, string> = {
  active: "Active",
  pending_approval: "Pending",
  rejected: "Rejected",
  disabled: "Disabled",
};

function partnerCellAlign(
  layout: PortalDataTableLayout,
  tableClass: string,
  cardsClass: string,
) {
  return layout === "table" ? tableClass : cardsClass;
}

function PartnerRowMenu({
  actions,
  pending,
  confirmDelete,
  onAction,
  layout,
}: {
  actions: ActionDef[];
  pending: ActionKey | null;
  confirmDelete: boolean;
  onAction: (key: ActionKey) => void;
  layout: PortalDataTableLayout;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number } | null>(
    null,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setMenuStyle(null);
      return;
    }
    function place() {
      const btn = buttonRef.current;
      const menu = menuRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const menuWidth = menu?.offsetWidth ?? 176;
      const menuHeight = menu?.offsetHeight ?? actions.length * 40;
      const gap = 4;
      const left = Math.max(8, rect.right - menuWidth);
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuHeight + gap && rect.top > menuHeight + gap;
      const top = openUp ? rect.top - gap - menuHeight : rect.bottom + gap;
      setMenuStyle({ top, left });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, actions.length, confirmDelete, pending]);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={portalRowKebabTriggerClassName(layout, {
          revealed: open || pending !== null,
        })}
        aria-label="Partner actions"
        aria-expanded={open}
      >
        <DotsThreeVertical size={18} weight={ICON_WEIGHT_LINEAR} />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 min-w-[11rem] rounded-xl border border-slate-100 bg-white py-1.5 shadow-lg"
            style={
              menuStyle
                ? { top: menuStyle.top, left: menuStyle.left }
                : { visibility: "hidden", top: 0, left: 0 }
            }
            onClick={(e) => e.stopPropagation()}
          >
            {actions.map((a) => {
              const isThisLoading = pending === a.key;
              const isDeleteConfirm = a.key === "delete" && confirmDelete;
              const label = isDeleteConfirm ? "Confirm delete?" : a.label;
              const itemClass = isDeleteConfirm
                ? "text-white bg-red-600 hover:bg-red-700"
                : a.menuClass;

              return (
                <button
                  key={a.key}
                  type="button"
                  disabled={pending !== null}
                  className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm transition-colors disabled:opacity-60 ${itemClass}`}
                  onClick={() => {
                    if (a.key !== "delete" || confirmDelete) setOpen(false);
                    onAction(a.key);
                  }}
                >
                  {isThisLoading ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    a.icon
                  )}
                  {label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}

export function PartnerTableRow({
  partner,
  columnVisibility = defaultPartnersColumnVisibility(),
  layout = "cards",
}: {
  partner: Partner;
  columnVisibility?: PartnersColumnVisibilityState;
  layout?: PortalDataTableLayout;
}) {
  const { push, router } = useNavigateWithPending();
  const [pending, setPending] = useState<ActionKey | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const actions = actionMap[partner.status] ?? [];
  const badgeVariant = statusBadgeVariant[partner.status] ?? "slate";
  const badgeLabel = statusLabel[partner.status] ?? partner.status;

  async function handleAction(key: ActionKey) {
    if (key === "delete") {
      if (!confirmDelete) {
        setConfirmDelete(true);
        return;
      }
      setPending("delete");
      await fetch(`/api/admin/partners/${partner.id}`, { method: "DELETE" });
      clientStore.invalidate([
        ClientStoreKeys.adminPartners,
        ClientStoreKeys.adminFilterList,
        ClientStoreKeys.adminDashboard,
      ]);
      router.refresh();
      return;
    }

    setConfirmDelete(false);
    setPending(key);

    const statusMap: Record<string, string> = {
      approve: "active",
      block: "disabled",
      activate: "active",
    };

    if (key === "approve") {
      await fetch("/api/admin/partners/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId: partner.id, action: "approve" }),
      });
    } else {
      await fetch(`/api/admin/partners/${partner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusMap[key] }),
      });
    }

    setPending(null);
    clientStore.invalidate([
      ClientStoreKeys.adminPartners,
      ClientStoreKeys.adminFilterList,
      ClientStoreKeys.adminDashboard,
    ]);
    router.refresh();
  }

  return (
    <tr
      className={clsx("cursor-pointer", portalTableRowClassName(undefined, layout))}
      onClick={() => push(`/admin/partners/${partner.id}`)}
      onMouseLeave={() => setConfirmDelete(false)}
    >
      <td className={portalTableDataCellClassName(layout, { first: true })}>
        <div className="flex items-center gap-3">
          <PartnerAvatar
            size="sm"
            avatarUrl={partner.avatarUrl}
            firstName={partner.firstName}
            lastName={partner.lastName}
          />
          <div className="min-w-0">
            <PortalTablePrimaryCell
              primary={`${partner.firstName} ${partner.lastName}`}
              secondary={partner.email}
            />
          </div>
        </div>
      </td>
      {columnVisibility.affiliation && (
        <td
          className={portalTableDataCellClassName(layout, {
            className: partnerCellAlign(
              layout,
              "text-left text-sm text-slate-500",
              "text-center text-sm text-slate-500",
            ),
          })}
        >
          {partner.affiliation ?? "—"}
        </td>
      )}
      {columnVisibility.status && (
        <td
          className={portalTableDataCellClassName(layout, {
            className: "text-center",
          })}
        >
          <Badge variant={badgeVariant}>{badgeLabel}</Badge>
        </td>
      )}
      {columnVisibility.priority && (
        <td
          className={portalTableDataCellClassName(layout, {
            className: "text-center",
          })}
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600">
            {partner.priority}
          </span>
        </td>
      )}
      {columnVisibility.wallet && (
        <td
          className={portalTableDataCellClassName(layout, {
            className: moneyCellClass(),
          })}
        >
          <span
            className={clsx(
              "font-semibold",
              partner.walletOk ? "text-slate-900" : "text-red-500",
            )}
          >
            {formatUsd(partner.walletBalance)}
          </span>
        </td>
      )}
      {columnVisibility.leadBuying && (
        <td
          className={portalTableDataCellClassName(layout, {
            className: "text-center",
          })}
        >
          <Badge variant={partner.leadBuying ? "green" : "slate"}>
            {partner.leadBuying ? "Active" : "Inactive"}
          </Badge>
        </td>
      )}
      {columnVisibility.leads && (
        <td
          className={portalTableDataCellClassName(layout, {
            className: partnerCellAlign(
              layout,
              "text-right tabular-nums font-medium text-slate-700",
              "text-center font-medium text-slate-700",
            ),
          })}
        >
          {partner.leadsCount}
        </td>
      )}
      <td
        className={portalRowActionsCellClassName(
          layout,
          portalTableDataCellClassName(layout, {
            last: true,
            className: layout === "cards" ? "px-3 text-center" : "text-center",
          }),
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {actions.length > 0 && (
          <PartnerRowMenu
            actions={actions}
            pending={pending}
            confirmDelete={confirmDelete}
            onAction={handleAction}
            layout={layout}
          />
        )}
      </td>
    </tr>
  );
}
