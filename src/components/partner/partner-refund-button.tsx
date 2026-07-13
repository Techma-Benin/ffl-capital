"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowCounterClockwise } from "@phosphor-icons/react";

export function PartnerRefundButton({
  leadDeliveryId,
}: {
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
    } catch {
      // allow retry
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
      >
        <ArrowCounterClockwise size={11} />
        Refund
      </button>
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
        <option value="wrong_filter">Type A — Wrong filter</option>
        <option value="invalid_phone">Type B — Invalid phone</option>
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
          {pending ? "Submitting…" : "Submit"}
        </button>
      </div>
    </div>
  );
}
