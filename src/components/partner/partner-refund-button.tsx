"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowCounterClockwise } from "@/lib/icons/client";
import { RefundRequestModal } from "@/components/refunds/refund-request-modal";

export function PartnerRefundButton({
  leadDeliveryId,
}: {
  leadDeliveryId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
      >
        <ArrowCounterClockwise size={11} />
        Refund
      </button>

      <RefundRequestModal
        open={open}
        onClose={() => setOpen(false)}
        title="Request Refund"
        submitLabel="Submit"
        onSubmit={async ({ refundType, reason }) => {
          const res = await fetch("/api/refunds", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leadDeliveryId,
              refundType,
              reason: reason || undefined,
            }),
          });
          if (!res.ok) throw new Error("Request failed");
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
