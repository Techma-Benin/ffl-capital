"use client";

import { useNavigateWithPending } from "@/hooks/use-navigate-with-pending";
import { useTransition } from "react";
import { Eye, ICON_WEIGHT } from "@/lib/icons/client";

interface Props {
  partnerId: string;
  label?: string;
}

export function ViewAsPartnerButton({
  partnerId,
  label = "View Partner Portal",
}: Props) {
  const { push } = useNavigateWithPending();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId }),
      });
      if (res.ok) {
        push("/partner");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`Could not impersonate partner: ${data?.error ?? res.statusText}`);
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="group btn-secondary btn-sm inline-flex items-center gap-1.5"
    >
      <Eye
        size={14}
        weight={ICON_WEIGHT}
        className="text-slate-500 transition-colors group-hover:text-violet-700"
        aria-hidden
      />
      {isPending ? "Loading…" : label}
    </button>
  );
}
