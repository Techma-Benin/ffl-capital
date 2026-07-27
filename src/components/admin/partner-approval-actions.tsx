"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle, XCircle } from "@/lib/icons/client";
import { InlineActionButton } from "@/components/ui/inline-action-button";
import { useActionFeedback } from "@/components/ui/action-feedback";
import { getApiErrorMessage } from "@/lib/client-api-error";

export function PartnerApprovalActions({ partnerId }: { partnerId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const { notify } = useActionFeedback();

  async function handleAction(action: "approve" | "reject") {
    setPending(action);
    try {
      const res = await fetch("/api/admin/partners/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, action }),
      });
      if (!res.ok) {
        throw new Error(
          await getApiErrorMessage(res, `Could not ${action} partner.`),
        );
      }
      notify({
        kind: "success",
        title: action === "approve" ? "Partner approved" : "Partner rejected",
      });
      router.refresh();
    } catch (error) {
      notify({
        kind: "error",
        title: `Partner ${action} failed`,
        message: error instanceof Error ? error.message : "Please try again.",
      });
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
