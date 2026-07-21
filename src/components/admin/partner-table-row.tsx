"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  portalTableCell,
  portalTableCellFirst,
  portalTableRowClassName,
  PortalTablePrimaryCell,
} from "@/components/ui/portal-data-table";
import { clsx } from "clsx";
import {
  CheckCircle,
  Prohibit,
  Lightning,
  Trash,
  DotsThree,
  ICON_WEIGHT_LINEAR,
} from "@/lib/icons/client";

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

function PartnerRowMenu({
  actions,
  pending,
  confirmDelete,
  onAction,
}: {
  actions: ActionDef[];
  pending: ActionKey | null;
  confirmDelete: boolean;
  onAction: (key: ActionKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        aria-label="Partner actions"
      >
        <DotsThree size={18} weight={ICON_WEIGHT_LINEAR} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-30 min-w-[11rem] rounded-xl border border-slate-100 bg-white py-1.5 shadow-lg">
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
        </div>
      )}
    </div>
  );
}

export function PartnerTableRow({ partner }: { partner: Partner }) {
  const router = useRouter();
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
    router.refresh();
  }

  return (
    <tr
      className={portalTableRowClassName()}
      onMouseLeave={() => setConfirmDelete(false)}
    >
      <td className={portalTableCellFirst}>
        <Link href={`/admin/partners/${partner.id}`} className="block hover:text-brand-600">
          <PortalTablePrimaryCell
            primary={`${partner.firstName} ${partner.lastName}`}
            secondary={partner.email}
          />
        </Link>
      </td>
      <td className={clsx(portalTableCell, "text-sm text-slate-500")}>
        {partner.affiliation ?? "—"}
      </td>
      <td className={portalTableCell}>
        <Badge variant={badgeVariant}>{badgeLabel}</Badge>
      </td>
      <td className={portalTableCell}>
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600">
          {partner.priority}
        </span>
      </td>
      <td className={portalTableCell}>
        <span className={`font-semibold ${partner.walletOk ? "text-slate-900" : "text-red-500"}`}>
          ${Number(partner.walletBalance).toFixed(2)}
        </span>
      </td>
      <td className={portalTableCell}>
        <Badge variant={partner.leadBuying ? "green" : "slate"}>
          {partner.leadBuying ? "Active" : "Inactive"}
        </Badge>
      </td>
      <td className={clsx(portalTableCell, "font-medium text-slate-700")}>
        {partner.leadsCount}
      </td>
      <td className="rounded-r-xl px-3 py-3.5 text-right">
        {actions.length > 0 && (
          <PartnerRowMenu
            actions={actions}
            pending={pending}
            confirmDelete={confirmDelete}
            onAction={handleAction}
          />
        )}
      </td>
    </tr>
  );
}
