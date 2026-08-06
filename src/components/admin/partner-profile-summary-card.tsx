"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { clsx } from "clsx";
import { PartnerAvatar } from "@/components/admin/partner-avatar";
import { formatUsd } from "@/lib/format-money";

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

function formatMemberSince(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export type PartnerProfileSummaryCardProps = {
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  affiliation: string | null;
  memberSince: Date | string;
  walletBalance: number;
  priority: number;
  avatarUrl?: string | null;
  /** Rendered below the status badge in the header (e.g. approve action). */
  headerFooter?: ReactNode;
};

export function PartnerProfileSummaryCard({
  firstName,
  lastName,
  email,
  status,
  affiliation,
  memberSince,
  walletBalance,
  priority,
  avatarUrl,
  headerFooter,
}: PartnerProfileSummaryCardProps) {
  const walletLow = walletBalance < 25;
  const badgeVariant = statusBadgeVariant[status] ?? "slate";
  const badgeText = statusLabel[status] ?? status;

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
        {headerFooter}
      </div>
      <dl className="space-y-2.5 px-5 py-4 text-sm">
        {[
          { label: "Company", value: affiliation ?? "—" },
          { label: "Member since", value: formatMemberSince(memberSince) },
          {
            label: "Wallet",
            value: formatUsd(walletBalance),
            valueClassName: walletLow ? "text-red-600" : undefined,
          },
          { label: "Priority", value: priority },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">{row.label}</dt>
            <dd className={clsx("tabular-nums font-semibold text-slate-900", row.valueClassName)}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
