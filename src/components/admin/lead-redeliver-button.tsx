"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { InlineActionButton } from "@/components/ui/inline-action-button";

export function LeadRedeliverButton({
  leadId,
  excludePartnerId,
}: {
  leadId: string;
  excludePartnerId?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

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
      if (!res.ok) throw new Error("Request failed");
      router.refresh();
    } catch {
      // allow retry
    } finally {
      setPending(false);
    }
  }

  return (
    <InlineActionButton
      tone="slate"
      icon={<PaperPlaneTilt size={12} />}
      loading={pending}
      loadingText="Redelivering…"
      onClick={handleRedeliver}
    >
      Redeliver
    </InlineActionButton>
  );
}
