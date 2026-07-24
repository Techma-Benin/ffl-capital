"use client";

import { useState } from "react";
import { Warning, X, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";

export function PendingApprovalBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 border-b border-amber-200/70 bg-amber-50/40 px-6 py-3 backdrop-blur-sm">
      <Warning size={15} className="flex-shrink-0 text-amber-700" weight={ICON_WEIGHT_LINEAR} />
      <p className="flex-1 text-sm text-slate-800">
        Complete your setup to start receiving leads.
      </p>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => setDismissed(true)}
        className="ml-auto flex-shrink-0 rounded p-1 text-slate-500 transition-colors hover:bg-amber-100/60 hover:text-slate-700"
      >
        <X size={16} weight={ICON_WEIGHT_LINEAR} />
      </button>
    </div>
  );
}
