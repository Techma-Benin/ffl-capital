"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PaperPlaneTilt, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { InlineActionButton } from "@/components/ui/inline-action-button";
import { useActionFeedback } from "@/components/ui/action-feedback";
import { getApiErrorMessage } from "@/lib/client-api-error";

export function LeadRedeliverButton({
  leadId,
  excludePartnerId,
}: {
  leadId: string;
  excludePartnerId?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const { notify } = useActionFeedback();

  async function handleRedeliver() {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/redeliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          excludePartnerId ? { partnerId: excludePartnerId } : {},
        ),
      });
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, "Could not redeliver lead."));
      }
      notify({
        kind: "success",
        title: "Lead redelivery started",
        message: "Delivery results will appear in the activity timeline.",
      });
      router.refresh();
    } catch (error) {
      notify({
        kind: "error",
        title: "Redelivery failed",
        message:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <InlineActionButton
      tone="slate"
      icon={<PaperPlaneTilt size={12} weight={ICON_WEIGHT_LINEAR} />}
      loading={pending}
      loadingText="Redelivering…"
      onClick={handleRedeliver}
    >
      Redeliver
    </InlineActionButton>
  );
}
