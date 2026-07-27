"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { PartnerProfileSummaryCard } from "@/components/admin/partner-profile-summary-card";
import { useActionFeedback } from "@/components/ui/action-feedback";
import { getApiErrorMessage } from "@/lib/client-api-error";

type PartnerProfileCardProps = {
  partnerId: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  affiliation: string | null;
  createdAt: Date;
  walletBalance: number;
  priority: number;
  avatarUrl?: string | null;
};

export function PartnerProfileCard({
  partnerId,
  firstName,
  lastName,
  email,
  status,
  affiliation,
  createdAt,
  walletBalance,
  priority,
  avatarUrl,
}: PartnerProfileCardProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const { notify } = useActionFeedback();

  async function handleApprove() {
    setPending(true);
    try {
      const res = await fetch("/api/admin/partners/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, action: "approve" }),
      });
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, "Could not approve partner."));
      }
      notify({ kind: "success", title: "Partner approved" });
      router.refresh();
    } catch (error) {
      notify({
        kind: "error",
        title: "Approval failed",
        message:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setPending(false);
    }
  }

  const approveButton =
    status === "pending_approval" ? (
      <button
        type="button"
        disabled={pending}
        onClick={handleApprove}
        className={clsx(
          "btn w-full max-w-full justify-center py-2.5 text-center text-sm font-semibold",
          "bg-rose-800 text-white shadow-sm",
          "hover:enabled:bg-rose-900 active:enabled:bg-rose-950",
          "focus-visible:ring-rose-500",
          "motion-safe:transition-[background-color,box-shadow] motion-safe:duration-200 motion-reduce:transition-none",
        )}
      >
        {pending ? "Approving…" : "Approve partner"}
      </button>
    ) : null;

  return (
    <PartnerProfileSummaryCard
      firstName={firstName}
      lastName={lastName}
      email={email}
      status={status}
      affiliation={affiliation}
      memberSince={createdAt}
      walletBalance={walletBalance}
      priority={priority}
      avatarUrl={avatarUrl}
      headerFooter={approveButton}
    />
  );
}
