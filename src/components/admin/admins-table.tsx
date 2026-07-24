"use client";

import { useState } from "react";
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
      {/* Table — no top header bar, matching mockup */}
      <div className="overflow-hidden rounded-[14px] border border-[#f4f3f8] bg-white shadow-[0_6px_24px_-14px_rgba(79,78,105,0.25)]">
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className="px-3.5 py-2.5 text-left text-[10.5px] font-extrabold text-[#b3b3bf] uppercase tracking-wide bg-[#f7f7fb] border-b border-[#f0eef6] whitespace-nowrap">
                Profile
              </th>
              <th className="px-3.5 py-2.5 text-left text-[10.5px] font-extrabold text-[#b3b3bf] uppercase tracking-wide bg-[#f7f7fb] border-b border-[#f0eef6] whitespace-nowrap">
                Email
              </th>
              <th className="px-3.5 py-2.5 text-left text-[10.5px] font-extrabold text-[#b3b3bf] uppercase tracking-wide bg-[#f7f7fb] border-b border-[#f0eef6] whitespace-nowrap">
                Last login
              </th>
              <th className="px-3.5 py-2.5 text-left text-[10.5px] font-extrabold text-[#b3b3bf] uppercase tracking-wide bg-[#f7f7fb] border-b border-[#f0eef6] whitespace-nowrap">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((row, idx) => (
              <tr
                key={row.id}
                className="hover:bg-[#fbfbfe] transition-colors"
                style={{
                  borderBottom:
                    idx < allRows.length - 1 ? "1px solid #f4f3f8" : "none",
                }}
              >
                <td className="px-3.5 py-[11px]">
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
                    <div
                      className="flex items-center justify-center rounded-full text-[12px] font-extrabold uppercase"
                      style={{
                        width: 36,
                        height: 36,
                        background: "#e8e7f3",
                        color: "#605BFF",
                      }}
                    >
                      {row.email.charAt(0)}
                    </div>
                  )}
                </td>
                <td className="px-3.5 py-[11px]">
                  <span className="font-extrabold text-[#030229] text-[12.5px]">
                    {row.email}
                  </span>
                  {row.id === currentUserId && (
                    <span
                      className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-extrabold"
                      style={{
                        background: "rgba(96,91,255,0.1)",
                        color: "#605BFF",
                      }}
                    >
                      you
                    </span>
                  )}
                </td>
                <td className="px-3.5 py-[11px] text-[12.5px] text-[#8b8a99]">
                  {formatLastSignIn(row.lastSignInAt)}
                </td>
                <td className="px-3.5 py-[11px]">
                  {row.type === "invited" ? (
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold"
                      style={{ background: "rgba(255,214,107,0.22)", color: "#a5842b" }}
                    >
                      Invited
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold"
                      style={{ background: "rgba(58,151,76,0.1)", color: "#3A974C" }}
                    >
                      Active
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {allRows.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3.5 py-8 text-center text-[12.5px] text-[#8b8a99]"
                >
                  No administrators found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Floating action button — fixed bottom-right */}
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          zIndex: 40,
          display: "inline-flex",
          alignItems: "center",
          gap: 9,
          height: 50,
          padding: "0 22px",
          borderRadius: 26,
          border: "none",
          background: "#605BFF",
          color: "#fff",
          fontFamily: "inherit",
          fontSize: 14,
          fontWeight: 800,
          cursor: "pointer",
          boxShadow: "0 8px 24px -4px rgba(96,91,255,0.45)",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add admin
      </button>

      <InviteAdminDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
