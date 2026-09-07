"use client";

import { useState } from "react";
import { Wallet, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { PartnerAdjustCreditsModal } from "@/components/admin/partner-adjust-credits-modal";

type PartnerAdjustCreditsButtonProps = {
  partnerId: string;
  displayName: string;
  partnerStatus: string;
  currentBalance: number;
};

export function PartnerAdjustCreditsButton({
  partnerId,
  displayName,
  partnerStatus,
  currentBalance,
}: PartnerAdjustCreditsButtonProps) {
  const [open, setOpen] = useState(false);

  if (partnerStatus !== "active") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group btn-secondary btn-sm inline-flex items-center gap-1"
      >
        <Wallet
          size={14}
          weight={ICON_WEIGHT_LINEAR}
          className="text-slate-500 transition-colors group-hover:text-amber-600"
          aria-hidden
        />
        Adjust credits
      </button>

      {open && (
        <PartnerAdjustCreditsModal
          partnerId={partnerId}
          displayName={displayName}
          currentBalance={currentBalance}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
