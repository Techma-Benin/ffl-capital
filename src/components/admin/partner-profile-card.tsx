"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { clsx } from "clsx";

const statusBadgeVariant: Record<string, "green" | "yellow" | "red" | "slate"> = {
  active: "green",
  pending_approval: "yellow",
  rejected: "red",
  disabled: "slate",
};

const statusLabel: Record<string, string> = {
  active: "Active",
  pending_approval: "Pending",
  rejected: "Rejected",
  disabled: "Disabled",
};

function partnerInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function PartnerAvatar({
  avatarUrl,
  firstName,
  lastName,
}: {
  avatarUrl?: string | null;
  firstName: string;
  lastName: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = partnerInitials(firstName, lastName);
  const showImage = Boolean(avatarUrl) && !imageFailed;

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Clerk CDN URL; no next/image domain config
      <img
        src={avatarUrl!}
        alt=""
        width={72}
        height={72}
        className="h-[72px] w-[72px] rounded-full object-cover"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-slate-100 text-xl font-semibold text-slate-700"
      aria-hidden
    >
      {initials}
    </div>
  );
}

function formatMemberSince(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
  const walletLow = walletBalance < 25;
  const badgeVariant = statusBadgeVariant[status] ?? "slate";
  const badgeText = statusLabel[status] ?? status;

  async function handleApprove() {
    setPending(true);
    try {
      const res = await fetch("/api/admin/partners/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, action: "approve" }),
      });
      if (!res.ok) throw new Error("Request failed");
      router.refresh();
    } catch {
      // allow retry
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card overflow-hidden rounded-xl">
      <div className="flex flex-col items-center gap-3 border-b border-slate-100 px-5 py-6 text-center">
        <PartnerAvatar
          avatarUrl={avatarUrl}
          firstName={firstName}
          lastName={lastName}
        />
        <div>
          <p className="text-lg font-semibold text-slate-900">
            {firstName} {lastName}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">{email}</p>
        </div>
        <Badge variant={badgeVariant}>{badgeText}</Badge>
        {status === "pending_approval" && (
          <button
            type="button"
            disabled={pending}
            onClick={handleApprove}
            className="btn-primary w-full max-w-full py-2.5 text-sm font-semibold"
          >
            {pending ? "Approving…" : "Approve partner"}
          </button>
        )}
      </div>
      <dl className="space-y-2.5 px-5 py-4 text-sm">
        {[
          { label: "Company", value: affiliation ?? "—" },
          { label: "Member since", value: formatMemberSince(createdAt) },
          {
            label: "Wallet",
            value: `$${walletBalance.toFixed(2)}`,
            valueClassName: walletLow ? "text-red-600 font-semibold" : "font-medium text-slate-900",
          },
          { label: "Priority", value: `Priority ${priority}` },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">{row.label}</dt>
            <dd className={clsx("tabular-nums text-slate-900", row.valueClassName)}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
