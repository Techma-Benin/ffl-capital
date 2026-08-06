"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { Badge } from "@/components/ui/badge";
import { PrimaryLinkArrow } from "@/components/ui/primary-link-arrow";
import { Sheet, SheetBody } from "@/components/ui/sheet";
import { formatDateTime } from "@/lib/format-datetime";
import { formatUsd, moneyValueClassName } from "@/lib/format-money";
import {
  formatRefundLeadChannel,
  refundLeadStatusBadge,
  refundLeadStatusLabel,
  type RefundLeadSnapshot,
} from "@/lib/admin/refund-lead-snapshot";
type Props = {
  lead: RefundLeadSnapshot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RefundLeadDetailSheet({ lead, open, onOpenChange }: Props) {
  if (!lead) return null;

  const statusVariant = refundLeadStatusBadge[lead.status] ?? "slate";
  const statusLabel = refundLeadStatusLabel[lead.status] ?? lead.status;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Lead"
      description={`Summary for ${lead.name}`}
    >
      <SheetBody className="space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold tracking-tight text-slate-900">
              {lead.name}
            </p>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">
              {lead.state}
            </span>
          </div>
          <div className="mt-3">
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Lead type", value: lead.leadType ?? "Unclassified" },
            {
              label: "Delivery price",
              value: formatUsd(lead.delivery.price),
              valueClassName: moneyValueClassName,
            },
            {
              label: "Delivery channel",
              value: formatRefundLeadChannel(lead.delivery.channel),
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-100 bg-slate-50/80 p-3"
            >
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {item.label}
              </dt>
              <dd
                className={clsx(
                  "mt-1 text-base font-bold text-slate-900",
                  item.valueClassName,
                )}
              >
                {item.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="rounded-xl border border-slate-100 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Partner
          </p>
          {lead.partner.id ? (
            <Link
              href={`/admin/partners/${lead.partner.id}`}
              className="mt-1 inline-flex text-sm font-medium text-brand-700 hover:underline"
              onClick={() => onOpenChange(false)}
            >
              {lead.partner.name}
            </Link>
          ) : (
            <p className="mt-1 text-sm font-medium text-slate-900">{lead.partner.name}</p>
          )}
        </div>

        <dl className="space-y-3 rounded-xl border border-slate-100 p-4">
          {[
            { label: "Received", value: formatDateTime(lead.receivedAt) },
            { label: "Delivered", value: formatDateTime(lead.delivery.deliveredAt) },
          ].map((item) => (
            <div key={item.label} className="flex items-baseline justify-between gap-4">
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {item.label}
              </dt>
              <dd className="text-sm font-medium text-slate-900" suppressHydrationWarning>
                {item.value}
              </dd>
            </div>
          ))}
        </dl>

        <PrimaryLinkArrow href={`/admin/leads/${lead.id}`} onClick={() => onOpenChange(false)}>
          View full lead
        </PrimaryLinkArrow>
      </SheetBody>
    </Sheet>
  );
}
