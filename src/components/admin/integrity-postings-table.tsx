"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { X, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { formatDateTime } from "@/lib/format-datetime";

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

type IntegrityEventRow = {
  id: string;
  type: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

type IntegrityDetail = {
  outcome: string | null;
  requestPayload: Record<string, unknown> | null;
  response: unknown;
  events: IntegrityEventRow[];
};

function statusBadge(status: ResaleStatus) {
  if (status === "sold") return <Badge variant="green">sold</Badge>;
  if (status === "rejected") return <Badge variant="red">rejected</Badge>;
  return <Badge variant="yellow">{status}</Badge>;
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="mt-2 max-h-56 overflow-auto rounded-lg border border-slate-100 bg-slate-50 p-3 font-mono text-[11px] text-slate-800 whitespace-pre-wrap break-all">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function PostingModal({
  posting,
  onClose,
}: {
  posting: PostingRow;
  onClose: () => void;
}) {
  const lead = posting.lead;
  const postedAt = formatDateTime(posting.postedAt);
  const createdAt = formatDateTime(posting.createdAt);

  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(
    posting.rejectionReason,
  );
  const [integrity, setIntegrity] = useState<IntegrityDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);

    fetch(`/api/admin/integrity/postings/${posting.id}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<{
          posting: { rejectionReason: string | null };
          integrity: IntegrityDetail;
        }>;
      })
      .then((data) => {
        if (cancelled) return;
        setRejectionReason(data.posting.rejectionReason);
        setIntegrity(data.integrity);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setDetailError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [posting.id]);

  const hasPayloadData =
    integrity &&
    (integrity.requestPayload ||
      integrity.response != null ||
      integrity.events.length > 0);

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
          {rejectionReason && (
            <section>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Rejection reason
              </p>
              <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-800 font-mono whitespace-pre-wrap break-all">
                {rejectionReason}
              </div>
            </section>
          )}

          {posting.status === "rejected" && !rejectionReason && !detailLoading && (
            <section>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Rejection reason
              </p>
              <p className="text-sm text-slate-400 italic">
                Not recorded — this posting was rejected before event logging was added.
              </p>
            </section>
          )}

          {/* Integrity payloads & outcome */}
          <section>
            <details className="group rounded-lg border border-slate-100 open:pb-3">
              <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2">
                <span
                  className="text-slate-400 transition-transform group-open:rotate-90 select-none"
                  aria-hidden
                >
                  ▶
                </span>
                Integrity payloads &amp; outcome
              </summary>

              <div className="px-3 pt-1 space-y-4">
                {detailLoading && (
                  <p className="text-sm text-slate-400">Loading…</p>
                )}

                {detailError && (
                  <p className="text-sm text-red-600">{detailError}</p>
                )}

                {!detailLoading && !detailError && !hasPayloadData && (
                  <p className="text-sm text-slate-400 italic">
                    No Integrity event data stored for this posting. Newer posts
                    record request payload and response on lead events.
                  </p>
                )}

                {!detailLoading && integrity && hasPayloadData && (
                  <>
                    {integrity.outcome && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Outcome
                        </p>
                        <p className="text-sm font-medium text-slate-900 capitalize">
                          {integrity.outcome}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Request payload
                      </p>
                      {integrity.requestPayload ? (
                        <JsonBlock value={integrity.requestPayload} />
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          Not stored on events for this posting.
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Response / webhook
                      </p>
                      {integrity.response != null ? (
                        <JsonBlock value={integrity.response} />
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          No response body recorded.
                        </p>
                      )}
                    </div>

                    {integrity.events.length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-slate-500 hover:text-slate-700 font-medium">
                          Event timeline ({integrity.events.length})
                        </summary>
                        <div className="mt-2 space-y-2">
                          {integrity.events.map((event) => (
                            <div
                              key={event.id}
                              className="rounded-lg border border-slate-100 bg-white px-3 py-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[11px] text-slate-700">
                                  {event.type}
                                </span>
                                <span
                                  className="text-[10px] text-slate-400"
                                  suppressHydrationWarning
                                >
                                  {formatDateTime(event.createdAt)}
                                </span>
                              </div>
                              {event.payload && (
                                <JsonBlock value={event.payload} />
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </>
                )}
              </div>
            </details>
          </section>
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
              <td className="text-xs text-slate-400" suppressHydrationWarning>
                {formatDateTime(p.postedAt)}
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
