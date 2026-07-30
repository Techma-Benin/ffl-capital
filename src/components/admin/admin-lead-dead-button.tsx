"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skull, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";

export function AdminLeadDeadButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function markDead() {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setConfirmOpen(false);
      router.refresh();
    } catch {
      // allow retry
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        className="btn-danger btn-sm inline-flex items-center gap-1"
      >
        <Skull size={12} weight={ICON_WEIGHT_LINEAR} className="shrink-0" aria-hidden />
        {pending ? "Marking…" : "Mark Dead"}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirmOpen(false);
        }}
        title="Mark lead as dead?"
        description="It will be removed from matching."
        confirmLabel="Mark dead"
        variant="danger"
        loading={pending}
        onConfirm={() => void markDead()}
      />
    </>
  );
}
