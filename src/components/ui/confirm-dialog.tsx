"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { X, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Danger styling for destructive actions (delete, block, etc.). */
  variant?: "default" | "danger";
  loading?: boolean;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function handleClose() {
    if (loading) return;
    onOpenChange(false);
  }

  function handleConfirm() {
    if (loading) return;
    onConfirm();
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

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="absolute right-4 top-4 flex-shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          aria-label="Close"
        >
          <X size={18} weight={ICON_WEIGHT_LINEAR} aria-hidden />
        </button>

        <div className="mb-4 text-center">
          <h2 id={titleId} className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-slate-500">
            {description}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="btn-secondary btn-sm"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={variant === "danger" ? "btn-danger btn-sm" : "btn-primary btn-sm"}
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
