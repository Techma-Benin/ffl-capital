"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { notify } from "@/lib/notify";

type ActivePartner = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  affiliation: string | null;
};

type SendLeadsToPartnerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadIds: string[];
  onSuccess: () => void;
};

export function SendLeadsToPartnerDialog({
  open,
  onOpenChange,
  leadIds,
  onSuccess,
}: SendLeadsToPartnerDialogProps) {
  const titleId = useId();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [partners, setPartners] = useState<ActivePartner[]>([]);
  const [query, setQuery] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);

  const leadIdsKey = useMemo(() => leadIds.join(","), [leadIds]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    setPartnerId("");
    setQuery("");

    fetch("/api/admin/partners/active")
      .then(async (res) => {
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Failed to load partners");
        }
        return res.json() as Promise<{ partners: ActivePartner[] }>;
      })
      .then((data) => {
        if (!cancelled) setPartners(data.partners);
      })
      .catch((err) => {
        if (!cancelled) {
          setFetchError(
            err instanceof Error ? err.message : "Failed to load partners",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, leadIdsKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter((partner) => {
      const name = `${partner.firstName} ${partner.lastName}`.toLowerCase();
      return (
        name.includes(q) ||
        partner.email.toLowerCase().includes(q) ||
        (partner.affiliation ?? "").toLowerCase().includes(q)
      );
    });
  }, [partners, query]);

  if (!open) return null;

  function handleClose() {
    if (submitting) return;
    onOpenChange(false);
  }

  async function handleSubmit() {
    if (!partnerId || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/leads/send-to-partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds, partnerId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        sent?: number;
        failed?: number;
        results?: { leadId: string; ok: boolean; error?: string }[];
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Send failed");
      }
      if ((data.failed ?? 0) === 0) {
        notify.success(
          `Sent ${data.sent ?? leadIds.length} lead${(data.sent ?? 0) === 1 ? "" : "s"} to the selected partner.`,
        );
      } else {
        const firstError = data.results?.find((row) => !row.ok)?.error;
        notify.error(
          `${data.sent ?? 0} sent, ${data.failed ?? 0} failed${firstError ? `: ${firstError}` : "."}`,
        );
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="absolute inset-0" onClick={handleClose} aria-hidden />
      <div
        role="dialog"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 id={titleId} className="text-sm font-semibold text-slate-900">
              Send to partner
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {leadIds.length} lead{leadIds.length === 1 ? "" : "s"} — billed to
              the selected partner if the category sale cap allows it.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={16} weight={ICON_WEIGHT_LINEAR} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search partners…"
            className="input w-full"
          />
          {loading ? (
            <p className="text-sm text-slate-500">Loading partners…</p>
          ) : fetchError ? (
            <p className="text-sm text-red-600">{fetchError}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500">No active partners found.</p>
          ) : (
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {filtered.map((partner) => {
                const name = `${partner.firstName} ${partner.lastName}`;
                return (
                  <li key={partner.id}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 hover:bg-slate-50">
                      <input
                        type="radio"
                        name="send-to-partner"
                        checked={partnerId === partner.id}
                        onChange={() => setPartnerId(partner.id)}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-medium text-slate-900">
                          {name}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {partner.email}
                          {partner.affiliation ? ` · ${partner.affiliation}` : ""}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
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
            onClick={() => void handleSubmit()}
            disabled={submitting || !partnerId}
            className="btn-primary btn-sm"
          >
            {submitting ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
