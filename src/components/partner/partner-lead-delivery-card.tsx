"use client";

import { useCallback, useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { endpointHostForDisplay } from "@/lib/delivery/outbound-url-display";
import { Lightning, Power, Trash, X, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { notify } from "@/lib/notify";
import type { PartnerCrmSummary } from "@/lib/partner/types";

const CRM_OUTBOUND_HREF = "/partner/settings/crm-outbound";

type CrmSummary = PartnerCrmSummary;

type TestApiResult = {
  ok?: boolean;
  statusCode?: number | null;
  bodyPreview?: string | null;
  error?: string | null;
  requestPayload?: Record<string, unknown>;
};

function ChannelRow({
  name,
  detail,
  status,
  action,
  href,
}: {
  name: string;
  detail: string;
  status?: "on" | "ready" | "off";
  action?: ReactNode;
  /** When set, the whole row navigates here (action buttons must stopPropagation). */
  href?: string;
}) {
  const router = useRouter();
  const interactive = Boolean(href);

  const badge =
    status === "on" ? (
      <Badge variant="green">On</Badge>
    ) : status === "ready" ? (
      <Badge variant="blue">Ready</Badge>
    ) : status === "off" ? (
      <Badge variant="slate">Off</Badge>
    ) : null;

  function navigate() {
    if (href) router.push(href);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!interactive) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate();
    }
  }

  return (
    <div
      className={
        interactive
          ? "-mx-2 flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          : "flex items-center justify-between gap-3"
      }
      role={interactive ? "link" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? navigate : undefined}
      onKeyDown={interactive ? onKeyDown : undefined}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">{name}</p>
          {badge}
        </div>
        <p className="truncate text-xs text-slate-500" title={detail}>
          {detail}
        </p>
      </div>
      {action ? (
        <div className="flex shrink-0 flex-wrap items-center gap-1">{action}</div>
      ) : null}
    </div>
  );
}

function ConfirmDeleteDialog({
  open,
  deleting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="crm-delete-title"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 id="crm-delete-title" className="text-base font-semibold text-slate-900">
            Remove CRM POST?
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={18} weight={ICON_WEIGHT_LINEAR} />
          </button>
        </div>
        <p className="text-sm text-slate-600">
          Leads will continue by email only. You can connect a CRM again anytime.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </button>
          <ActionButton
            type="button"
            variant="danger"
            loading={deleting}
            onClick={onConfirm}
          >
            Delete
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

function CrmTestModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestApiResult | null>(null);
  const [requestError, setRequestError] = useState("");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setTesting(true);
    setResult(null);
    setRequestError("");

    void (async () => {
      try {
        const res = await fetch("/api/partners/me/crm-outbound/test", {
          method: "POST",
        });
        const data = (await res.json()) as TestApiResult & { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setRequestError(data.error ?? "Test failed");
          setResult(data);
          return;
        }
        setResult(data);
      } catch {
        if (!cancelled) setRequestError("Test request failed");
      } finally {
        if (!cancelled) setTesting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const payloadJson =
    result?.requestPayload != null
      ? JSON.stringify(result.requestPayload, null, 2)
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="crm-test-title"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 id="crm-test-title" className="text-base font-semibold text-slate-900">
            Test CRM delivery
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={18} weight={ICON_WEIGHT_LINEAR} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {testing ? (
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-600">
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600"
                aria-hidden
              />
              Sending mock lead to your CRM…
            </div>
          ) : null}

          {!testing && requestError && !result?.requestPayload ? (
            <p className="text-sm text-red-600">{requestError}</p>
          ) : null}

          {!testing && result ? (
            <div
              className={`rounded-lg px-3 py-3 text-sm ${
                result.ok
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              {result.ok ? (
                <p className="font-semibold">
                  Success
                  {result.statusCode != null ? ` — HTTP ${result.statusCode}` : ""}
                </p>
              ) : (
                <p className="font-semibold">
                  Failed
                  {result.statusCode != null ? ` — HTTP ${result.statusCode}` : ""}
                </p>
              )}
              {(result.error || requestError) && !result.ok ? (
                <p className="mt-1 text-xs opacity-90">
                  {result.error ?? requestError}
                </p>
              ) : null}
              {result.bodyPreview ? (
                <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap break-words rounded bg-white/60 p-2 font-mono text-[11px] text-slate-800">
                  {result.bodyPreview}
                </pre>
              ) : null}
            </div>
          ) : null}

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Request payload
            </p>
            {payloadJson ? (
              <pre className="max-h-56 overflow-auto rounded-lg border border-slate-100 bg-slate-50 p-3 font-mono text-[11px] text-slate-800">
                {payloadJson}
              </pre>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">
                {testing
                  ? "Payload will appear when the request completes…"
                  : "No payload returned."}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 px-5 py-3">
          <button type="button" className="btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function PartnerLeadDeliveryCard({
  partnerEmail,
  className,
  initialCrm,
}: {
  partnerEmail: string;
  className?: string;
  /** When provided (including `null`), skip the mount-time CRM fetch. */
  initialCrm?: CrmSummary;
}) {
  const hasInitial = initialCrm !== undefined;
  const [loading, setLoading] = useState(!hasInitial);
  const [crm, setCrm] = useState<CrmSummary>(hasInitial ? initialCrm : null);
  const [testOpen, setTestOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/partners/me/crm-outbound");
      if (res.status === 404) {
        setCrm(null);
        return;
      }
      if (!res.ok) {
        notify.error("Could not load lead delivery settings.");
        return;
      }
      const data = (await res.json()) as {
        enabled: boolean;
        endpointUrl: string;
        authType: string;
      };
      setCrm({
        enabled: data.enabled,
        endpointUrl: data.endpointUrl,
        authType: data.authType,
      });
    } catch {
      notify.error("Could not load lead delivery settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasInitial) return;
    void load();
  }, [hasInitial, load]);

  /** Config exists in DB (saved endpoint) — independent of enabled. */
  const configured = Boolean(crm?.endpointUrl?.trim());
  const host = crm?.endpointUrl
    ? endpointHostForDisplay(crm.endpointUrl)
    : null;

  async function handleToggleEnabled() {
    if (!crm || toggling) return;
    const nextEnabled = !crm.enabled;
    setToggling(true);
    try {
      // Disable: flip off only. Enable: server tests the endpoint first; stays off on failure.
      const patchRes = await fetch("/api/partners/me/crm-outbound", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      if (!patchRes.ok) {
        const data = await patchRes.json().catch(() => ({}));
        notify.error(
          typeof data.error === "string"
            ? data.error
            : nextEnabled
              ? "Could not enable CRM — connection test failed"
              : "Could not disable CRM",
        );
        return;
      }
      const data = (await patchRes.json()) as {
        enabled: boolean;
        endpointUrl: string;
        authType: string;
      };
      setCrm({
        enabled: data.enabled,
        endpointUrl: data.endpointUrl,
        authType: data.authType,
      });
    } catch {
      notify.error(
        nextEnabled
          ? "Could not enable CRM — connection test failed"
          : "Could not disable CRM",
      );
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/partners/me/crm-outbound", {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        notify.error(
          typeof data.error === "string" ? data.error : "Delete failed",
        );
        return;
      }
      setCrm(null);
      setDeleteOpen(false);
    } catch {
      notify.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <section
        id="lead-delivery"
        className={
          className ??
          "card flex h-full min-w-0 flex-col overflow-hidden rounded-xl"
        }
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Lead delivery</h2>
          <p className="mt-1 text-xs text-slate-500">
            How matched leads reach you. Email is always on; CRM POST is optional.
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-4 px-5 py-4">
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : (
            <>
              <div className="space-y-3">
                <ChannelRow
                  name="Email"
                  detail={partnerEmail.trim() || "—"}
                  status="on"
                />
                <div className="border-t border-slate-100" />
                {configured && host ? (
                  <>
                    <ChannelRow
                      name="CRM POST"
                      detail={host}
                      status={crm?.enabled ? "ready" : "off"}
                      href={CRM_OUTBOUND_HREF}
                      action={
                        <>
                          <button
                            type="button"
                            title={
                              crm?.enabled
                                ? "Disable CRM POST"
                                : "Enable CRM POST — tests connection first"
                            }
                            aria-label={
                              crm?.enabled
                                ? "Disable CRM POST"
                                : "Enable CRM POST — tests connection first"
                            }
                            disabled={toggling}
                            className={
                              crm?.enabled
                                ? "rounded p-1.5 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                                : "rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleToggleEnabled();
                            }}
                          >
                            <Power size={16} weight={ICON_WEIGHT_LINEAR} aria-hidden />
                          </button>
                          <button
                            type="button"
                            title="Test"
                            aria-label="Test CRM delivery"
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTestOpen(true);
                            }}
                          >
                            <Lightning size={16} weight={ICON_WEIGHT_LINEAR} aria-hidden />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            aria-label="Remove CRM POST"
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash size={16} weight={ICON_WEIGHT_LINEAR} aria-hidden />
                          </button>
                        </>
                      }
                    />
                  </>
                ) : (
                  <ChannelRow
                    name="CRM POST"
                    detail="Send a JSON POST to your CRM when a lead matches."
                    action={
                      <Link
                        href={CRM_OUTBOUND_HREF}
                        className="btn-secondary btn-sm shrink-0"
                      >
                        Connect CRM
                      </Link>
                    }
                  />
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <CrmTestModal open={testOpen} onClose={() => setTestOpen(false)} />
      <ConfirmDeleteDialog
        open={deleteOpen}
        deleting={deleting}
        onClose={() => {
          if (!deleting) setDeleteOpen(false);
        }}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
