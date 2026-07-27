"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowCounterClockwise, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { useActionFeedback } from "@/components/ui/action-feedback";
import { getApiErrorMessage } from "@/lib/client-api-error";

export function LeadReprocessButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const { notify } = useActionFeedback();

  async function handleReprocess() {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/reprocess`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, "Could not reprocess lead."));
      }
      notify({
        kind: "success",
        title: "Lead queued for reprocessing",
        message: "The lead status will update when processing completes.",
      });
      router.refresh();
    } catch (error) {
      notify({
        kind: "error",
        title: "Reprocessing failed",
        message:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleReprocess}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors disabled:opacity-50"
    >
      <ArrowCounterClockwise
        size={12}
        weight={ICON_WEIGHT_LINEAR}
        className={pending ? "animate-spin" : ""}
        aria-hidden
      />
      {pending ? "Processing…" : "Reprocess"}
    </button>
  );
}
