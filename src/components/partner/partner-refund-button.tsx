"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { RefundRequestModal } from "@/components/refunds/refund-request-modal";
import { useActionFeedback } from "@/components/ui/action-feedback";
import { getApiErrorMessage } from "@/lib/client-api-error";

export function PartnerRefundButton({
  leadDeliveryId,
}: {
  leadDeliveryId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { notify } = useActionFeedback();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
      >
        <Wallet size={14} weight={ICON_WEIGHT_LINEAR} className="shrink-0" />
        Invalid number
      </button>

      <RefundRequestModal
        open={open}
        onClose={() => setOpen(false)}
        title="Report an invalid number"
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
          if (!res.ok) {
            throw new Error(
              await getApiErrorMessage(res, "Could not submit refund request."),
            );
          }
          setOpen(false);
          notify({
            kind: "success",
            title: "Refund request submitted",
            message: "You can follow its status from My Leads.",
          });
          router.refresh();
        }}
      />
    </>
  );
}
