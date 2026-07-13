"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { InlineActionButton } from "@/components/ui/inline-action-button";

export function RefundReviewActions({ refundId }: { refundId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);

  async function handleAction(action: "approve" | "reject") {
    setPending(action);
    try {
      const res = await fetch(`/api/admin/refunds/${refundId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Request failed");
      router.refresh();
    } catch {
      // allow retry
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <InlineActionButton
        tone="emerald"
        icon={<CheckCircle size={12} />}
        loading={pending === "approve"}
        loadingText="Approving…"
        onClick={() => handleAction("approve")}
      >
        Approve
      </InlineActionButton>
      <InlineActionButton
        tone="red"
        icon={<XCircle size={12} />}
        loading={pending === "reject"}
        loadingText="Rejecting…"
        onClick={() => handleAction("reject")}
      >
        Reject
      </InlineActionButton>
    </div>
  );
}
