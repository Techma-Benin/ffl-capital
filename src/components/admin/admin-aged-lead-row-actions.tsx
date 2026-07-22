"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { Skull, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";

export function AdminAgedLeadRowActions({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function markDead() {
    if (
      !confirm(
        "Mark this lead as dead? It will be removed from the aged marketplace.",
      )
    ) {
      return;
    }
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
      onClick={(e) => {
        e.stopPropagation();
        void markDead();
      }}
      disabled={pending}
      title="Mark dead"
      aria-label="Mark lead as dead"
      className={clsx(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-opacity",
        "hover:bg-red-50 hover:text-red-600 disabled:opacity-60",
        "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
      )}
    >
      <Skull size={16} weight={ICON_WEIGHT_LINEAR} aria-hidden />
    </button>
  );
}
