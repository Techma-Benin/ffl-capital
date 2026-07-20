"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { X, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";

type ResaleStatus = "pending" | "sold" | "rejected";
type ResaleMode = "realtime" | "storefront";

export interface PostingRow {
  id: string;
  leadId: string;
  mode: ResaleMode;
  status: ResaleStatus;
  externalRef: string | null;
  postedAt: string | null;
  createdAt: string;
  lead: {
    firstName: string;
    lastName: string;
    state: string;
    leadType: string | null;
  };
  rejectionReason: string | null;
}

function statusBadge(status: ResaleStatus) {
  if (status === "sold") return <Badge variant="green">sold</Badge>;
  if (status === "rejected") return <Badge variant="red">rejected</Badge>;
  return <Badge variant="yellow">{status}</Badge>;
}

function PostingModal({
  posting,
  onClose,
}: {
  posting: PostingRow;
  onClose: () => void;
}) {
  const lead = posting.lead;
  const postedAt = posting.postedAt
    ? new Date(posting.postedAt).toLocaleString()
    : "—";
  const createdAt = new Date(posting.createdAt).toLocaleString();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900 text-base">
              Posting detail
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{posting.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={18} weight={ICON_WEIGHT_LINEAR} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
          {/* Lead info */}
          <section>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Lead
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-slate-500">Name</span>
                <p className="font-medium text-slate-900">
                  <Link
                    href={`/admin/leads/${posting.leadId}`}
                    className="hover:text-brand-600 underline underline-offset-2"
                    onClick={onClose}
                  >
                    {lead.firstName} {lead.lastName}
                  </Link>
                </p>
              </div>
              <div>
                <span className="text-slate-500">State</span>
                <p className="font-medium text-slate-900">{lead.state}</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Type</span>
                <p className="font-medium text-slate-900 capitalize">
                  {lead.leadType?.replace(/_/g, " ") ?? "—"}
                </p>
              </div>
            </div>
          </section>

          {/* Posting info */}
          <section>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Posting
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-slate-500">Status</span>
                <p className="mt-0.5">{statusBadge(posting.status)}</p>
              </div>
              <div>
                <span className="text-slate-500">Mode</span>
                <p className="font-medium text-slate-900 capitalize">{posting.mode}</p>
              </div>
              <div>
                <span className="text-slate-500">Posted at</span>
                <p className="font-medium text-slate-900">{postedAt}</p>
              </div>
              <div>
                <span className="text-slate-500">Created at</span>
                <p className="font-medium text-slate-900">{createdAt}</p>
              </div>
              {posting.externalRef && (
                <div className="col-span-2">
                  <span className="text-slate-500">External ref</span>
                  <p className="font-mono text-xs text-slate-700 mt-0.5 break-all">
                    {posting.externalRef}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Rejection reason */}
          {posting.rejectionReason && (
            <section>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Rejection reason
              </p>
              <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-800 font-mono whitespace-pre-wrap break-all">
                {posting.rejectionReason}
              </div>
            </section>
          )}

          {posting.status === "rejected" && !posting.rejectionReason && (
            <section>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Rejection reason
              </p>
              <p className="text-sm text-slate-400 italic">
                Not recorded — this posting was rejected before event logging was added.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export function IntegrityPostingsTable({ postings }: { postings: PostingRow[] }) {
  const [selected, setSelected] = useState<PostingRow | null>(null);

  return (
    <>
      <table className="data-table">
        <thead>
          <tr>
            <th>Lead</th>
            <th>State</th>
            <th>Mode</th>
            <th>Status</th>
            <th>External Ref</th>
            <th>Posted</th>
          </tr>
        </thead>
        <tbody>
          {postings.map((p) => (
            <tr
              key={p.id}
              className="cursor-pointer hover:bg-brand-50 transition-colors"
              onClick={() => setSelected(p)}
            >
              <td className="font-medium">
                {p.lead.firstName} {p.lead.lastName}
              </td>
              <td>{p.lead.state}</td>
              <td className="capitalize">{p.mode}</td>
              <td>{statusBadge(p.status)}</td>
              <td className="text-xs text-slate-500">{p.externalRef ?? "—"}</td>
              <td className="text-xs text-slate-400">
                {p.postedAt
                  ? new Date(p.postedAt).toLocaleDateString()
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <PostingModal posting={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
