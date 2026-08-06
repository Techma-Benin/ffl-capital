"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, X, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";

export interface AgedPurchaseSuccessLead {
  leadId: string;
  firstName: string;
  lastName: string;
}

export function AgedPurchaseSuccessModal({
  open,
  onOpenChange,
  leads,
  totalCount,
  onViewLeads,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: AgedPurchaseSuccessLead[];
  totalCount: number;
  onViewLeads: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => closeRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open]);

  function handleClose() {
    onOpenChange(false);
  }

  if (!open) return null;

  const previewLeads = leads.slice(0, 3);
  const remaining = totalCount - previewLeads.length;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle size={22} weight={ICON_WEIGHT_LINEAR} className="text-emerald-600" aria-hidden />
            </div>
            <div>
              <h2 id={titleId} className="text-base font-semibold text-slate-900">
                Purchase successful
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {totalCount === 1
                  ? "You've purchased 1 lead."
                  : `You've purchased ${totalCount} leads.`}
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={handleClose}
            className="flex-shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={18} weight={ICON_WEIGHT_LINEAR} aria-hidden />
          </button>
        </div>

        {previewLeads.length > 0 && (
          <ul className="mb-5 space-y-1.5 rounded-lg border border-slate-100 bg-slate-50 p-3">
            {previewLeads.map((lead) => (
              <li
                key={lead.leadId}
                className="text-sm font-medium text-slate-800"
              >
                {lead.firstName} {lead.lastName}
              </li>
            ))}
            {remaining > 0 && (
              <li className="text-xs text-slate-500">
                +{remaining} more {remaining === 1 ? "lead" : "leads"}
              </li>
            )}
          </ul>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="btn-secondary btn-sm"
          >
            Keep buying leads
          </button>
          <button
            type="button"
            onClick={onViewLeads}
            className="btn-primary btn-sm"
          >
            View my leads
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
