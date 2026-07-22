"use client";

import { useNavigateWithPending } from "@/hooks/use-navigate-with-pending";
import { useTransition } from "react";
import { Warning, ICON_WEIGHT } from "@/lib/icons/client";

interface Props {
  partnerName: string;
}

export function ImpersonationBanner({ partnerName }: Props) {
  const { push } = useNavigateWithPending();
  const [isPending, startTransition] = useTransition();

  function handleExit() {
    startTransition(async () => {
      await fetch("/api/admin/impersonate", { method: "DELETE" });
      push("/admin");
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-yellow-300 bg-yellow-100 px-6 py-2.5">
      <div className="flex items-center gap-2">
        <Warning size={15} className="flex-shrink-0 text-yellow-700" weight={ICON_WEIGHT} />
        <p className="text-sm font-medium text-yellow-800">
          Viewing <span className="font-bold">{partnerName}</span>&apos;s portal
          &mdash; admin view
        </p>
      </div>
      <button
        onClick={handleExit}
        disabled={isPending}
        className="rounded border border-yellow-400 bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-800 transition hover:bg-yellow-200 disabled:opacity-60"
      >
        {isPending ? "Exiting…" : "Exit"}
      </button>
    </div>
  );
}
