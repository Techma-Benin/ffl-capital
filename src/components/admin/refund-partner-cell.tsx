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
      className="group -mx-2 max-w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-brand-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      aria-label={`View partner profile for ${partner.name}`}
    >
      {variant === "compact" ? (
        <span className="font-medium text-slate-900 group-hover:text-brand-800">
          {partner.name}
        </span>
      ) : (
        <>
          <p className="font-medium text-slate-900 group-hover:text-brand-800">
            {partner.name}
          </p>
          {showEmail ? (
            <p className="text-xs text-slate-400 group-hover:text-slate-500">
              {partner.email}
            </p>
          ) : null}
        </>
      )}
    </button>
  );
}
