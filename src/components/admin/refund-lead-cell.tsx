"use client";

import type { RefundLeadSnapshot } from "@/lib/admin/refund-lead-snapshot";

type Props = {
  lead: RefundLeadSnapshot;
  onSelect: (lead: RefundLeadSnapshot) => void;
  variant?: "stacked" | "compact";
};

export function RefundLeadCell({ lead, onSelect, variant = "stacked" }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(lead)}
      className="group -mx-2 max-w-full rounded-lg px-2 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      aria-label={`View lead details for ${lead.name}`}
    >
      {variant === "compact" ? (
        <span className="font-medium text-slate-900 group-hover:underline">
          {lead.name}
        </span>
      ) : (
        <p className="font-medium text-slate-900 group-hover:underline">
          {lead.name}
        </p>
      )}
    </button>
  );
}
