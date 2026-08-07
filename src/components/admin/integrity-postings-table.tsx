"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ClientTablePagination } from "@/components/ui/table-pagination";
import { paginateClientList } from "@/lib/client-table-pagination";
import {
  ArrowCounterClockwise,
  X,
  ICON_WEIGHT_LINEAR,
} from "@/lib/icons/client";
import { formatDateTime } from "@/lib/format-datetime";
import {
  formatIntegrityEventType,
  formatIntegrityOutcome,
  formatResaleStatusLabel,
} from "@/lib/integrity/event-labels";
import { notify } from "@/lib/notify";
import { formatStateForIntegrity } from "@/lib/constants/us-states";
import { resolveIntegrityLabelForMode } from "@/lib/integrity/build-payload";
import {
  IntegrityPayloadEditModal,
  payloadRecordToFields,
  type IntegrityPayloadCategory,
  type IntegrityPayloadFields,
} from "@/components/admin/integrity-payload-edit-modal";

const POSTINGS_PAGE_SIZE = 25;

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
  integrityOutcome?: string | null;
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

type DetailLead = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  state: string;
  leadType: string | null;
  dob: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  trustedformCertUrl: string | null;
  leadidToken: string | null;
  externalId: string | null;
  haveIul: string | null;
  primaryGoal: string | null;
};

function formatDobMmDdYyyy(dob: string | null): string {
  if (!dob) return "";
  const m = dob.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[2]}/${m[3]}/${m[1]}`;
  return dob;
}

function formatDobMdY(dob: string | null): string {
  const mmddyyyy = formatDobMmDdYyyy(dob);
  if (!mmddyyyy) return "";
  const match = mmddyyyy.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return mmddyyyy;
  return `${Number(match[1])}/${Number(match[2])}/${match[3]}`;
}

function fieldsFromLead(
  lead: DetailLead,
  mode: ResaleMode,
  category: IntegrityPayloadCategory | null,
): IntegrityPayloadFields {
  const integrityLabel =
    resolveIntegrityLabelForMode(mode, {
      realtime: category?.integrityLabel,
      storefront: category?.integrityLabelStorefront,
    }) ?? "";
  return {
    first_name: lead.firstName,
    last_name: lead.lastName,
    email: lead.email ?? "",
    phone_1: lead.phone ?? "",
    state: formatStateForIntegrity(lead.state),
    address_1: lead.address ?? "",
    city: lead.city ?? "",
    postal_code: lead.zip ?? "",
    dob: formatDobMdY(lead.dob),
    dob_mmddyyyy_thom: formatDobMmDdYyyy(lead.dob),
    lead_type_thom: integrityLabel,
    trustedform_cert_url: lead.trustedformCertUrl ?? "",
    universal_leadid: lead.leadidToken ?? "",
    has_iul_thom: lead.haveIul ?? "",
    primary_goal_thom: lead.primaryGoal ?? "",
    vendor_lead_id_thom: lead.externalId ?? lead.id,
  };
}

function statusBadge(status: ResaleStatus, integrityOutcome?: string | null) {
  if (integrityOutcome === "no_campaign_available") {
    return <Badge variant="yellow">No Campaign Available</Badge>;
  }
  const label = formatResaleStatusLabel(status, integrityOutcome);
  if (status === "sold") return <Badge variant="green">{label}</Badge>;
  if (status === "rejected") return <Badge variant="red">{label}</Badge>;
  return <Badge variant="yellow">{label}</Badge>;
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-3 font-mono text-[11px] text-slate-800 whitespace-pre-wrap break-all">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

type ModalTab = "detail" | "payloads" | "events";

const MODAL_TABS: { key: ModalTab; label: string }[] = [
  { key: "detail", label: "Posting detail" },
  { key: "payloads", label: "Integrity payloads & outcome" },
  { key: "events", label: "Events" },
];

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

  const [tab, setTab] = useState<ModalTab>("detail");
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(
    posting.rejectionReason,
  );
  const [integrity, setIntegrity] = useState<IntegrityDetail | null>(null);
  const [detailStatus, setDetailStatus] = useState<ResaleStatus>(posting.status);
  const [detailLead, setDetailLead] = useState<DetailLead | null>(null);
  const [categories, setCategories] = useState<IntegrityPayloadCategory[]>([]);
  const [reprocessPending, setReprocessPending] = useState(false);
  const [reprocessModal, setReprocessModal] = useState<{
    fields: IntegrityPayloadFields;
    category: IntegrityPayloadCategory | null;
  } | null>(null);
  const [detailReloadKey, setDetailReloadKey] = useState(0);

  const loadDetail = useCallback(() => {
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
          posting: {
            rejectionReason: string | null;
            status?: ResaleStatus;
            lead?: DetailLead;
          };
          integrity: IntegrityDetail;
          categories?: IntegrityPayloadCategory[];
        }>;
      })
      .then((data) => {
        if (cancelled) return;
        setRejectionReason(data.posting.rejectionReason);
        if (data.posting.status) setDetailStatus(data.posting.status);
        if (data.posting.lead) setDetailLead(data.posting.lead);
        setIntegrity(data.integrity);
        if (data.categories) setCategories(data.categories);
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

  useEffect(() => {
    return loadDetail();
  }, [loadDetail, detailReloadKey]);

  function openReprocessModal() {
    if (reprocessPending || detailStatus === "sold") return;

    const category =
      categories.find(
        (c) => c.type === (detailLead?.leadType ?? posting.lead.leadType ?? ""),
      ) ?? null;

    const fromLead = detailLead
      ? fieldsFromLead(detailLead, posting.mode, category)
      : {
          first_name: posting.lead.firstName,
          last_name: posting.lead.lastName,
          state: formatStateForIntegrity(posting.lead.state),
          lead_type_thom:
            resolveIntegrityLabelForMode(posting.mode, {
              realtime: category?.integrityLabel,
              storefront: category?.integrityLabelStorefront,
            }) ?? "",
        };

    const fromPrior = payloadRecordToFields(integrity?.requestPayload);
    setReprocessModal({
      fields: { ...fromLead, ...fromPrior },
      category,
    });
  }

  function setReprocessField(key: string, value: string) {
    setReprocessModal((prev) =>
      prev ? { ...prev, fields: { ...prev.fields, [key]: value } } : prev,
    );
  }

  async function sendReprocess() {
    if (!reprocessModal || reprocessPending) return;
    setReprocessPending(true);
    try {
      const res = await fetch(
        `/api/admin/integrity/postings/${posting.id}/reprocess`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ manualPayload: reprocessModal.fields }),
        },
      );
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        posted?: boolean;
        reason?: string;
      } | null;
      if (!res.ok) {
        throw new Error(
          data?.error ?? data?.reason ?? "Integrity reprocess failed",
        );
      }
      notify.success(
        `Re-sent to Integrity ${posting.mode === "storefront" ? "Storefront" : "RealTime"}`,
      );
      setReprocessModal(null);
      setDetailReloadKey((k) => k + 1);
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : "Integrity reprocess failed",
      );
    } finally {
      setReprocessPending(false);
    }
  }

  const hasPayloadData =
    integrity &&
    (integrity.requestPayload ||
      integrity.response != null ||
      integrity.outcome);

  const events = integrity?.events ?? [];
  const reprocessBlocked = detailStatus === "sold";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900 text-base">
              Integrity posting
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{posting.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openReprocessModal}
              disabled={reprocessPending || reprocessBlocked || detailLoading}
              title={
                reprocessBlocked
                  ? "Sold postings cannot be reprocessed (live sale)"
                  : `Review payload, then send via Integrity ${posting.mode === "storefront" ? "Storefront" : "RealTime"}`
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40"
            >
              <ArrowCounterClockwise
                size={14}
                weight={ICON_WEIGHT_LINEAR}
                aria-hidden
              />
              Reprocess
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
            >
              <X size={18} weight={ICON_WEIGHT_LINEAR} />
            </button>
          </div>
        </div>

        {/* Tab bar — same underline pattern as admin settings */}
        <div
          className="flex flex-wrap items-stretch px-6 border-b border-slate-200"
          role="tablist"
          aria-label="Posting sections"
        >
          {MODAL_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={[
                "px-[14px] py-[14px] text-[15px] font-extrabold border-b-[2.5px] -mb-px",
                "flex items-center whitespace-nowrap transition-colors",
                tab === t.key
                  ? "text-brand-600 border-brand-600"
                  : "text-slate-700 border-transparent hover:text-slate-900",
              ].join(" ")}
            >
              {t.label}
              {t.key === "events" && !detailLoading && events.length > 0
                ? ` (${events.length})`
                : null}
            </button>
          ))}
        </div>

        {/* Body — one tab at a time */}
        <div className="overflow-y-auto px-6 py-5 flex-1">
          {tab === "detail" && (
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
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
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Posting
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <span className="text-slate-500">Status</span>
                    <p className="mt-0.5">{statusBadge(detailStatus, integrity?.outcome)}</p>
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
              </div>

              {rejectionReason && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Rejection reason
                  </p>
                  <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-800 font-mono whitespace-pre-wrap break-all">
                    {rejectionReason}
                  </div>
                </div>
              )}

              {detailStatus === "rejected" && !rejectionReason && !detailLoading && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Rejection reason
                  </p>
                  <p className="text-sm text-slate-400 italic">
                    Not recorded — this posting was rejected before event logging was added.
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === "payloads" && (
            <div className="space-y-4">
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
                        {formatIntegrityOutcome(integrity.outcome)}
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
                </>
              )}
            </div>
          )}

          {tab === "events" && (
            <div className="space-y-3">
              {detailLoading && (
                <p className="text-sm text-slate-400">Loading…</p>
              )}

              {detailError && (
                <p className="text-sm text-red-600">{detailError}</p>
              )}

              {!detailLoading && !detailError && events.length === 0 && (
                <p className="text-sm text-slate-400 italic">
                  No events recorded for this posting.
                </p>
              )}

              {!detailLoading && !detailError && events.length > 0 && (
                <div className="space-y-2">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border border-slate-100 bg-white px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-slate-700">
                          {formatIntegrityEventType(event.type)}
                        </span>
                        <span
                          className="text-[10px] text-slate-400"
                          suppressHydrationWarning
                        >
                          {formatDateTime(event.createdAt)}
                        </span>
                      </div>
                      {event.payload && <JsonBlock value={event.payload} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {reprocessModal && (
        <IntegrityPayloadEditModal
          flow={posting.mode}
          fields={reprocessModal.fields}
          categories={categories}
          category={reprocessModal.category}
          pending={reprocessPending}
          onFieldChange={setReprocessField}
          onCancel={() => setReprocessModal(null)}
          onSend={() => void sendReprocess()}
        />
      )}
    </div>
  );
}

export function IntegrityPostingsTable({ postings }: { postings: PostingRow[] }) {
  const [selected, setSelected] = useState<PostingRow | null>(null);
  const [page, setPage] = useState(1);

  const { pageItems, page: currentPage } = useMemo(
    () => paginateClientList(postings, page, POSTINGS_PAGE_SIZE),
    [postings, page],
  );

  useEffect(() => {
    setPage((p) => {
      const totalPages = Math.max(1, Math.ceil(postings.length / POSTINGS_PAGE_SIZE));
      return Math.min(p, totalPages);
    });
  }, [postings.length]);

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
          {pageItems.map((p) => (
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
              <td>{statusBadge(p.status, p.integrityOutcome)}</td>
              <td className="text-xs text-slate-500">{p.externalRef ?? "—"}</td>
              <td className="text-xs text-slate-400" suppressHydrationWarning>
                {formatDateTime(p.postedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ClientTablePagination
        page={currentPage}
        pageSize={POSTINGS_PAGE_SIZE}
        total={postings.length}
        onPageChange={setPage}
      />

      {selected && (
        <PostingModal posting={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
