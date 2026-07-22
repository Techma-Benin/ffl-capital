"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Wallet, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { InlineActionButton } from "@/components/ui/inline-action-button";

export function AdminLeadRefundButton({
  leadId,
  leadDeliveryId,
}: {
  leadId: string;
  leadDeliveryId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [refundType, setRefundType] = useState<"wrong_filter" | "invalid_phone">(
    "wrong_filter",
  );
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    try {
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
      if (!res.ok) throw new Error("Request failed");
      setOpen(false);
      router.refresh();
    } catch {
      // allow retry
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <InlineActionButton
        tone="red"
        icon={<Wallet size={12} weight={ICON_WEIGHT_LINEAR} />}
        onClick={() => setOpen(true)}
      >
        Refund
      </InlineActionButton>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2 min-w-[200px]">
      <select
        value={refundType}
        onChange={(e) =>
          setRefundType(e.target.value as "wrong_filter" | "invalid_phone")
        }
        className="form-select py-1 text-xs w-full"
      >
        <option value="wrong_filter">Wrong Filter</option>
        <option value="invalid_phone">Invalid Phone</option>
      </select>
      <input
        type="text"
        placeholder="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="form-input py-1 text-xs w-full"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-secondary btn-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="btn-primary btn-sm"
        >
          {pending ? "Processing…" : "Issue Refund"}
        </button>
      </div>
    </div>
  );
}
