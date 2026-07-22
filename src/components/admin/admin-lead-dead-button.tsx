"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Skull, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";

export function AdminLeadDeadButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function markDead() {
    if (!confirm("Mark this lead as dead? It will be removed from matching.")) return;
    setPending(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
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
      onClick={markDead}
      disabled={pending}
      className="btn-danger btn-sm inline-flex items-center gap-1"
    >
      <Skull size={12} weight={ICON_WEIGHT_LINEAR} className="shrink-0" aria-hidden />
      {pending ? "Marking…" : "Mark Dead"}
    </button>
  );
}
