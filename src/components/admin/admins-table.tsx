"use client";

import { useState } from "react";
import { Plus, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { InviteAdminDialog } from "@/components/admin/invite-admin-dialog";

export type AdminRow = {
  id: string;
  email: string;
  imageUrl: string | null;
  lastSignInAt: number | null;
  type: "admin" | "invited";
};

function formatLastSignIn(ts: number | null): string {
  if (!ts) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ts));
}

export function AdminsTable({
  admins,
  pendingInvites,
  currentUserId,
}: {
  admins: AdminRow[];
  pendingInvites: AdminRow[];
  currentUserId: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const allRows = [...admins, ...pendingInvites];

  return (
    <>
      <div className="flex items-center justify-between pb-4">
        <p className="text-sm text-slate-500">
          {admins.length} admin{admins.length !== 1 ? "s" : ""}
          {pendingInvites.length > 0 &&
            `, ${pendingInvites.length} pending invite${pendingInvites.length !== 1 ? "s" : ""}`}
        </p>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="btn-primary btn-sm inline-flex items-center gap-1.5"
        >
          <Plus size={14} weight={ICON_WEIGHT_LINEAR} aria-hidden />
          Add admin
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-left font-medium text-slate-500">
                Profile
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">
                Email
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">
                Last login
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {allRows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  {row.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.imageUrl}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                      <span className="text-xs font-medium uppercase">
                        {row.email.charAt(0)}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-800">{row.email}</span>
                  {row.id === currentUserId && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                      you
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {formatLastSignIn(row.lastSignInAt)}
                </td>
                <td className="px-4 py-3">
                  {row.type === "invited" ? (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                      Invited
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      Active
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {allRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  No administrators found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <InviteAdminDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
