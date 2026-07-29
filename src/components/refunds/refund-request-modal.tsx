"use client";

import { useEffect, useState } from "react";
import { X, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { notify } from "@/lib/notify";
import type { RefundTypeValue } from "@/lib/refunds/constants";

export function RefundRequestModal({
  open,
  onClose,
  title,
  titleHighlight,
  submitLabel,
  submitPendingLabel = "Submitting…",
  submitIcon,
  submitClassName,
  blockedMessage,
  isSubmitting: externalSubmitting,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  titleHighlight?: React.ReactNode;
  submitLabel: string;
  submitPendingLabel?: string;
  submitIcon?: React.ReactNode;
  submitClassName?: string;
  blockedMessage?: string | null;
  isSubmitting?: boolean;
  onSubmit: (
    payload: { refundType: RefundTypeValue; reason: string },
  ) => void | Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [internalSubmitting, setInternalSubmitting] = useState(false);

  const isSubmitting = externalSubmitting ?? internalSubmitting;

  useEffect(() => {
    if (!open) return;
    setReason("");
    setInternalSubmitting(false);
  }, [open]);

  if (!open) return null;

  async function handleSubmit() {
    if (blockedMessage || isSubmitting) return;
    const trackInternal = externalSubmitting === undefined;
    if (trackInternal) setInternalSubmitting(true);
    try {
      await onSubmit({ refundType: "invalid_phone", reason });
    } catch {
      notify.error("Something went wrong. Please try again.");
    } finally {
      if (trackInternal) setInternalSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            {title}
            {titleHighlight ? <> {titleHighlight}</> : null}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={18} weight={ICON_WEIGHT_LINEAR} />
          </button>
        </div>

        {blockedMessage ? (
          <p className="text-sm text-slate-600">{blockedMessage}</p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Reason (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the issue…"
                rows={3}
                className="form-input w-full resize-none text-sm"
              />
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary btn-sm">
            Cancel
          </button>
          {!blockedMessage && (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting}
              className={submitClassName ?? "btn-primary btn-sm"}
            >
              {submitIcon ? (
                <span className="inline-flex items-center gap-1.5">
                  {submitIcon}
                  {isSubmitting ? submitPendingLabel : submitLabel}
                </span>
              ) : isSubmitting ? (
                submitPendingLabel
              ) : (
                submitLabel
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
