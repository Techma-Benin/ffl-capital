"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { Spinner } from "@/components/ui/spinner";
import { Skull, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { useActionFeedback } from "@/components/ui/action-feedback";
import { getApiErrorMessage } from "@/lib/client-api-error";

export function AdminAgedLeadRowActions({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const { notify } = useActionFeedback();

  async function markDead() {
    if (
      !confirm(
        "Mark this lead as dead? It will be removed from the aged marketplace.",
      )
    ) {
      return;
    }
    setIsPending(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, "Could not remove the lead."));
      }
      notify({
        kind: "success",
        title: "Lead removed from the aged marketplace",
      });
      router.refresh();
    } catch (error) {
      notify({
        kind: "error",
        title: "Lead was not updated",
        message:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void markDead();
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
  );
}
