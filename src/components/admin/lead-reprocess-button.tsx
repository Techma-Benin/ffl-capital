"use client";

import { ArrowCounterClockwise, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";

export function LeadReprocessButton({
  pending,
  onReprocess,
}: {
  pending?: boolean;
  onReprocess: () => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      onClick={() => void onReprocess()}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors disabled:opacity-50"
    >
      <ArrowCounterClockwise
        size={12}
        weight={ICON_WEIGHT_LINEAR}
        className={pending ? "animate-spin" : ""}
        aria-hidden
      />
      {pending ? "Processing…" : "Reprocess"}
    </button>
  );
}
