"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Eye } from "@phosphor-icons/react";

interface Props {
  partnerId: string;
}

export function ViewAsPartnerButton({ partnerId }: Props) {
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
      {isPending ? "Loading…" : "View Partner Portal"}
    </button>
  );
}
