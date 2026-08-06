"use client";

import { isPartnerActive } from "@/lib/partner/active";
import { usePartner } from "@/components/partner/partner-provider";

export function PartnerStatusBar() {
  const { partner } = usePartner();
  const active = isPartnerActive(partner);

  if (active) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Lead buying active
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
      <span className="h-2 w-2 rounded-full bg-slate-300" />
      Lead buying inactive
    </span>
  );
}
