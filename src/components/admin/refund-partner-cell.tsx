"use client";

import type { RefundPartnerSnapshot } from "@/lib/admin/refund-partner-snapshot";

type Props = {
  partner: RefundPartnerSnapshot;
  onSelect: (partner: RefundPartnerSnapshot) => void;
  /** When set, shows a secondary email line (pending table). */
  showEmail?: boolean;
  /** History table uses a single-line name only. */
  variant?: "stacked" | "compact";
};

export function RefundPartnerCell({
  partner,
  onSelect,
  showEmail = false,
  variant = "stacked",
}: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(partner)}
      className="block w-full cursor-pointer px-3 py-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
      aria-label={`View partner profile for ${partner.name}`}
    >
      {variant === "compact" ? (
        <span className="font-medium text-orange-600">
          {partner.name}
        </span>
      ) : (
        <>
          <p className="font-medium text-orange-600">{partner.name}</p>
          {showEmail ? (
            <p className="text-xs text-slate-400">{partner.email}</p>
          ) : null}
        </>
      )}
    </button>
  );
}
