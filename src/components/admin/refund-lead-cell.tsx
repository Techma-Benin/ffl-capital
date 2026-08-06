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
      className="block w-full cursor-pointer px-3 py-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
      aria-label={`View lead details for ${lead.name}`}
    >
      {variant === "compact" ? (
        <span className="font-medium text-slate-900">{lead.name}</span>
      ) : (
        <p className="font-medium text-slate-900">{lead.name}</p>
      )}
    </button>
  );
}
