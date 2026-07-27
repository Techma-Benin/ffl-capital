"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lightning, Prohibit, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { useActionFeedback } from "@/components/ui/action-feedback";
import { getApiErrorMessage } from "@/lib/client-api-error";

export function BlockPartnerButton({
  partnerId,
  status,
}: {
  partnerId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { notify } = useActionFeedback();

  const canBlock = status === "active" || status === "pending_approval";
  const canActivate = status === "disabled" || status === "rejected";

  if (!canBlock && !canActivate) return null;

  function handleClick() {
    if (canBlock) {
      const ok = confirm(
        "Block this partner? They will no longer receive leads and filter sets will be deactivated.",
      );
      if (!ok) return;
    }

    startTransition(async () => {
      const nextStatus = canBlock ? "disabled" : "active";
      const res = await fetch(`/api/admin/partners/${partnerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        notify({
          kind: "error",
          title: "Partner was not updated",
          message: await getApiErrorMessage(
            res,
            "Could not update partner status.",
          ),
        });
        return;
      }
      notify({
        kind: "success",
        title: canBlock ? "Partner blocked" : "Partner activated",
      });
      router.refresh();
    });
  }

  if (canBlock) {
    return (
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
