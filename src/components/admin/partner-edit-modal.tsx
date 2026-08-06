"use client";

import { useEffect } from "react";
import { X, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import {
  PartnerEditForm,
  type PartnerEditFormInitial,
} from "@/components/admin/partner-edit-form";

type PartnerEditModalProps = {
  partnerId: string;
  displayName: string;
  initial: PartnerEditFormInitial;
  onClose: () => void;
};

export function PartnerEditModal({
  partnerId,
  displayName,
  initial,
  onClose,
}: PartnerEditModalProps) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      <div
        id="partner-account-edit"
        role="dialog"
        aria-labelledby="partner-edit-modal-title"
        aria-describedby="partner-edit-modal-desc"
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl"
      >
        <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <h2
              id="partner-edit-modal-title"
              className="text-sm font-semibold text-slate-900"
            >
              Edit Partner
            </h2>
            <p id="partner-edit-modal-desc" className="mt-0.5 text-xs text-slate-500">
              Account settings for {displayName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={16} weight={ICON_WEIGHT_LINEAR} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <PartnerEditForm
            partnerId={partnerId}
            initial={initial}
            variant="modal"
            onSaved={onClose}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
