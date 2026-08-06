"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function LeadReprocessButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleReprocess() {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/reprocess`, {
        method: "POST",
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
    <button
      type="button"
      onClick={handleReprocess}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors disabled:opacity-50"
    >
      <RefreshCw size={12} className={pending ? "animate-spin" : ""} />
      {pending ? "Processing…" : "Reprocess"}
    </button>
  );
}
