"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lightning, Prohibit, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { notify } from "@/lib/notify";

export function BlockPartnerButton({
  partnerId,
  status,
}: {
  partnerId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canBlock = status === "active" || status === "pending_approval";
  const canActivate = status === "disabled" || status === "rejected";

  if (!canBlock && !canActivate) return null;

  function handleClick() {
    if (canBlock) {
      setConfirmOpen(true);
      return;
    }
    runStatusUpdate();
  }

  function runStatusUpdate() {
    startTransition(async () => {
      const nextStatus = canBlock ? "disabled" : "active";
      const res = await fetch(`/api/admin/partners/${partnerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        notify.error(data.error ?? "Could not update partner status");
        return;
      }
      router.refresh();
    });
  }

  if (canBlock) {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          className="group btn-danger btn-sm inline-flex items-center gap-1.5"
        >
          <Prohibit
            size={14}
            weight={ICON_WEIGHT_LINEAR}
            className="opacity-90"
            aria-hidden
          />
          {isPending ? "Blocking…" : "Block partner"}
        </button>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Block partner?"
          description="They will no longer receive leads and filter sets will be deactivated."
          confirmLabel="Block partner"
          variant="danger"
          loading={isPending}
          onConfirm={() => {
            setConfirmOpen(false);
            runStatusUpdate();
          }}
        />
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="group btn-secondary btn-sm inline-flex items-center gap-1.5"
    >
      <Lightning
        size={14}
        weight={ICON_WEIGHT_LINEAR}
        className="text-emerald-600"
        aria-hidden
      />
      {isPending ? "Activating…" : "Activate partner"}
    </button>
  );
}
