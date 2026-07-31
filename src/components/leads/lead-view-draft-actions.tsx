"use client";

import { clsx } from "clsx";
import { X, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";

export function LeadViewDraftActions({
  pending,
  onSave,
  onClear,
}: {
  pending?: boolean;
  onSave: () => void;
  onClear: () => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-slate-200 bg-transparent p-0.5"
      role="group"
      aria-label="Unsaved view changes"
    >
      <button
        type="button"
        disabled={pending}
        onClick={onSave}
        className={clsx(
          "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
          "bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60",
        )}
      >
        {pending ? "Saving…" : "Save view"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={onClear}
        className={clsx(
          "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
          "bg-transparent text-slate-500 hover:bg-white/60 hover:text-slate-700 disabled:opacity-60",
        )}
        aria-label="Discard changes"
        title="Discard changes"
      >
        <X size={16} weight={ICON_WEIGHT_LINEAR} aria-hidden />
      </button>
    </div>
  );
}
