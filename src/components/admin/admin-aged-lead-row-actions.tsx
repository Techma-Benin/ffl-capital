"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skull, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";

export function AdminAgedLeadRowActions({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function markDead() {
    setIsPending(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setConfirmOpen(false);
      router.refresh();
    } catch {
      // allow retry
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setConfirmOpen(true);
        }}
        disabled={isPending}
        aria-busy={isPending}
        title={isPending ? "Marking as dead…" : "Mark dead"}
        aria-label={isPending ? "Marking lead as dead" : "Mark lead as dead"}
        className={clsx(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-opacity",
          "hover:bg-red-50 hover:text-red-600 disabled:cursor-wait disabled:opacity-100",
          isPending
            ? "opacity-100 text-red-600"
            : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        )}
      >
        {isPending ? (
          <Spinner size="xs" variant="red" label="Marking lead as dead" />
        ) : (
          <Skull size={16} weight={ICON_WEIGHT_LINEAR} aria-hidden />
        )}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open && !isPending) setConfirmOpen(false);
        }}
        title="Mark lead as dead?"
        description="It will be removed from the aged marketplace."
        confirmLabel="Mark dead"
        variant="danger"
        loading={isPending}
        onConfirm={() => void markDead()}
      />
    </>
  );
}
