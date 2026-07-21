"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  portalTableCell,
  portalTableCellFirst,
  portalTableCellLast,
  portalTableRowClassName,
  PortalTablePrimaryCell,
} from "@/components/ui/portal-data-table";
import { clsx } from "clsx";
import {
  CheckCircle,
  Prohibit,
  Lightning,
  Trash,
  ICON_WEIGHT_BOLD,
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

const actionMap: Record<
  string,
  { key: ActionKey; label: string; icon: React.ReactNode; tone: string }[]
> = {
  pending_approval: [
    { key: "approve", label: "Approve", icon: <CheckCircle size={13} weight={ICON_WEIGHT_BOLD} />, tone: "emerald" },
    { key: "block",   label: "Block",   icon: <Prohibit   size={13} weight={ICON_WEIGHT_BOLD} />, tone: "red"    },
  ],
  active: [
    { key: "block",  label: "Block",  icon: <Prohibit size={13} weight={ICON_WEIGHT_BOLD} />, tone: "red"   },
  ],
  disabled: [
    { key: "activate", label: "Activate", icon: <Lightning size={13} weight={ICON_WEIGHT_BOLD} />, tone: "emerald" },
    { key: "delete",   label: "Delete",   icon: <Trash     size={13} weight={ICON_WEIGHT_BOLD} />, tone: "red"     },
  ],
  rejected: [
    { key: "activate", label: "Activate", icon: <Lightning size={13} weight={ICON_WEIGHT_BOLD} />, tone: "emerald" },
    { key: "delete",   label: "Delete",   icon: <Trash     size={13} weight={ICON_WEIGHT_BOLD} />, tone: "red"     },
  ],
};

const toneClasses: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  red:     "bg-red-50 text-red-700 hover:bg-red-100",
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

export function PartnerTableRow({ partner }: { partner: Partner }) {
  const router = useRouter();
  const [pending, setPending] = useState<ActionKey | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const actions = actionMap[partner.status] ?? [];
  const badgeVariant = statusBadgeVariant[partner.status] ?? "slate";
  const badgeLabel = statusLabel[partner.status] ?? partner.status;

  async function handleAction(key: ActionKey) {
    if (key === "delete") {
      if (!confirmDelete) { setConfirmDelete(true); return; }
      setPending("delete");
      await fetch(`/api/admin/partners/${partner.id}`, { method: "DELETE" });
      router.refresh();
      return;
    }

    setConfirmDelete(false);
    setPending(key);

    const statusMap: Record<string, string> = {
      approve:  "active",
      block:    "disabled",
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
      <td className={clsx(portalTableCellLast, "w-12 text-right")}>
        <div className="invisible flex items-center justify-end gap-1 group-hover:visible">
          {actions.map((a) => {
            const isThisLoading = pending === a.key;
            const isDeleteConfirm = a.key === "delete" && confirmDelete;
            return (
              <button
                key={a.key}
                type="button"
                disabled={pending !== null}
                onClick={() => handleAction(a.key)}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60 ${
                  isDeleteConfirm
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : toneClasses[a.tone]
                }`}
                title={a.label}
              >
                {isThisLoading ? (
                  <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                ) : (
                  a.icon
                )}
                {isDeleteConfirm ? "Confirm?" : a.label}
              </button>
            );
          })}
        </div>
      </td>
    </tr>
  );
}
