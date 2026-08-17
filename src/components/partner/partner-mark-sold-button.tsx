"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";

export function PartnerMarkSoldButton({
  deliveryId,
}: {
  deliveryId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMarkSold() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/partner/deliveries/${deliveryId}/mark-sold`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Request failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleMarkSold}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-60"
      >
        <CheckCircle
          size={14}
          weight={ICON_WEIGHT_LINEAR}
          className="shrink-0"
        />
        {loading ? "Marking…" : "Mark as sold"}
      </button>
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
