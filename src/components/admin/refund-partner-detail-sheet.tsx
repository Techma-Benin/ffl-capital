"use client";

import { Badge } from "@/components/ui/badge";
import { PrimaryLinkArrow } from "@/components/ui/primary-link-arrow";
import { Sheet, SheetBody } from "@/components/ui/sheet";
import {
  refundPartnerStatusBadge,
  refundPartnerStatusLabel,
  type RefundPartnerSnapshot,
} from "@/lib/admin/refund-partner-snapshot";
type Props = {
  partner: RefundPartnerSnapshot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RefundPartnerDetailSheet({ partner, open, onOpenChange }: Props) {
  if (!partner) return null;

  const statusVariant =
    refundPartnerStatusBadge[partner.status] ?? "slate";
  const statusLabel =
    refundPartnerStatusLabel[partner.status] ?? partner.status;

  const statesPreview =
    partner.filterStates.length <= 6
      ? partner.filterStates.join(", ")
      : `${partner.filterStates.slice(0, 6).join(", ")} +${partner.filterStates.length - 6} more`;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Partner"
      description={`Profile summary for ${partner.name}`}
    >
      <SheetBody className="space-y-6">
        <div>
          <p className="text-lg font-semibold tracking-tight text-slate-900">
            {partner.name}
          </p>
          <p className="mt-1 text-sm text-slate-500">{partner.email}</p>
          <div className="mt-3">
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Deliveries", value: partner.deliveryCount.toLocaleString() },
            {
              label: "Wallet balance",
              value: `$${partner.walletBalance.toFixed(2)}`,
            },
            { label: "Priority", value: String(partner.priority) },
            { label: "Lead type", value: partner.leadType },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {item.label}
              </dt>
              <dd className="mt-1 text-base font-bold text-slate-900">{item.value}</dd>
            </div>
          ))}
        </dl>

        {partner.filterStates.length > 0 ? (
          <div className="rounded-xl border border-slate-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Filter states
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{statesPreview}</p>
          </div>
        ) : null}

        <PrimaryLinkArrow
          href={`/admin/partners/${partner.id}`}
          onClick={() => onOpenChange(false)}
        >
          View full profile
        </PrimaryLinkArrow>
      </SheetBody>
    </Sheet>
  );
}
