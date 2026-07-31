"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { notify } from "@/lib/notify";

type EligiblePartner = {
  id: string;
  firstName: string;
  lastName: string;
  priority: number;
  matchCount: number;
};

type BulkReprocessPartnersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadIds: string[];
  leadCount: number;
  onSuccess: () => void;
};

export function BulkReprocessPartnersDialog({
  open,
  onOpenChange,
  leadIds,
  leadCount,
  onSuccess,
}: BulkReprocessPartnersDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [partners, setPartners] = useState<EligiblePartner[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [fetchError, setFetchError] = useState<string | null>(null);

  const leadIdsKey = useMemo(() => leadIds.join(","), [leadIds]);

  function releaseHold(leadIdsToRelease: string[]) {
    if (leadIdsToRelease.length === 0) return;
    void fetch("/api/admin/leads/bulk-reprocess/release-hold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadIds: leadIdsToRelease }),
      keepalive: true,
    });
  }

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || leadIds.length === 0) return;

    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    setPartners([]);
    setCheckedIds(new Set());

    fetch("/api/admin/leads/bulk-reprocess/eligible-partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadIds }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Failed to load eligible partners");
        }
        return res.json() as Promise<{ partners: EligiblePartner[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setPartners(data.partners);
        setCheckedIds(new Set(data.partners.map((p) => p.id)));
      })
      .catch((err) => {
        if (cancelled) return;
        setFetchError(err instanceof Error ? err.message : "Failed to load partners");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, leadIdsKey, leadIds]);

  function handleClose() {
    if (submitting) return;
    releaseHold(leadIds);
    onOpenChange(false);
  }

  function togglePartner(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setCheckedIds(new Set(partners.map((p) => p.id)));
  }

  function deselectAll() {
    setCheckedIds(new Set());
  }

  async function handleConfirm() {
    if (submitting || checkedIds.size === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/leads/bulk-reprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds,
          partnerIds: Array.from(checkedIds),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Bulk reprocess failed");
      }
      const data = (await res.json()) as {
        processed: number;
        matched: number;
        errors: number;
        unmatched: number;
      };
      onOpenChange(false);
      onSuccess();
      if (data.errors === 0) {
        notify.success(
          `${data.matched} matched, ${data.unmatched} still unmatched (${data.processed} processed).`,
        );
      } else {
        notify.error(
          `${data.matched} matched, ${data.unmatched} unmatched, ${data.errors} failed.`,
        );
      }
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : "Bulk reprocess failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-slate-900">
              Reprocess leads
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-slate-500">
              Select active partners to retry matching for {leadCount} selected lead
              {leadCount === 1 ? "" : "s"}.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="flex-shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} weight={ICON_WEIGHT_LINEAR} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading partners…</p>
          ) : fetchError ? (
            <p className="py-8 text-center text-sm text-red-600">{fetchError}</p>
          ) : partners.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No active partners match these leads.
            </p>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  {checkedIds.size} of {partners.length} selected
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="font-medium text-brand-600 hover:text-brand-700"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="font-medium text-slate-500 hover:text-slate-700"
                  >
                    Deselect all
                  </button>
                </div>
              </div>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {partners.map((partner) => {
                  const checked = checkedIds.has(partner.id);
                  return (
                    <li key={partner.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePartner(partner.id)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {partner.firstName} {partner.lastName}
                          </p>
                          <p className="text-xs text-slate-500">
                            Matches {partner.matchCount} of {leadCount} selected lead
                            {leadCount === 1 ? "" : "s"}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          Priority {partner.priority}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="btn-secondary btn-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={submitting || loading || checkedIds.size === 0 || partners.length === 0}
            className="btn-primary btn-sm"
          >
            {submitting ? "Processing…" : "Reprocess"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
