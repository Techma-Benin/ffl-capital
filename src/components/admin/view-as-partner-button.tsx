"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Eye } from "@/lib/icons/client";

interface Props {
  partnerId: string;
  label?: string;
}

export function ViewAsPartnerButton({
  partnerId,
  label = "View Partner Portal",
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId }),
      });
      if (res.ok) {
        router.push("/partner");
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
      className="btn-secondary btn-sm inline-flex items-center gap-1.5"
    >
      <Eye size={14} />
      {isPending ? "Loading…" : label}
    </button>
  );
}
