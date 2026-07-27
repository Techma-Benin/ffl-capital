"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Wallet, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { InlineActionButton } from "@/components/ui/inline-action-button";
import { RefundRequestModal } from "@/components/refunds/refund-request-modal";
import { useActionFeedback } from "@/components/ui/action-feedback";
import { getApiErrorMessage } from "@/lib/client-api-error";

export function AdminLeadRefundButton({
  leadId,
  leadDeliveryId,
}: {
  leadId: string;
  leadDeliveryId?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { notify } = useActionFeedback();
  const noDelivery = !leadDeliveryId;

  return (
    <>
      <InlineActionButton
        tone="orange"
        icon={<Wallet size={12} weight={ICON_WEIGHT_LINEAR} />}
        onClick={() => setOpen(true)}
        disabled={noDelivery}
      >
        Refund
      </InlineActionButton>

      <RefundRequestModal
        open={open}
        onClose={() => setOpen(false)}
        title="Issue Refund"
        submitLabel="Issue Refund"
        submitPendingLabel="Processing…"
        blockedMessage={
          noDelivery
            ? "No refundable delivery found for this lead."
            : null
        }
        onSubmit={async ({ refundType, reason }) => {
          if (!leadDeliveryId) return;
          const res = await fetch(`/api/admin/leads/${leadId}/refund`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leadDeliveryId,
              refundType,
              reason: reason || undefined,
              autoApprove: true,
            }),
          });
          if (!res.ok) {
            throw new Error(
              await getApiErrorMessage(res, "Could not issue refund."),
            );
          }
          setOpen(false);
          notify({ kind: "success", title: "Refund issued" });
          router.refresh();
        }}
      />
    </>
  );
}
