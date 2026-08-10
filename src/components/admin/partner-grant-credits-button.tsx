"use client";

import { useState } from "react";
import { Wallet, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { PartnerGrantCreditsModal } from "@/components/admin/partner-grant-credits-modal";

type PartnerGrantCreditsButtonProps = {
  partnerId: string;
  displayName: string;
  partnerStatus: string;
  isSuperAdmin: boolean;
};

export function PartnerGrantCreditsButton({
  partnerId,
  displayName,
  partnerStatus,
  isSuperAdmin,
}: PartnerGrantCreditsButtonProps) {
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
          className="text-slate-500 transition-colors group-hover:text-emerald-600"
          aria-hidden
        />
        Grant credits
      </button>

      {open && (
        <PartnerGrantCreditsModal
          partnerId={partnerId}
          displayName={displayName}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
