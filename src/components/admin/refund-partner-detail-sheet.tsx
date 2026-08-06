"use client";

import { PartnerProfileSummaryCard } from "@/components/admin/partner-profile-summary-card";
import { PrimaryLinkArrow } from "@/components/ui/primary-link-arrow";
import { Sheet, SheetBody } from "@/components/ui/sheet";
import type { RefundPartnerSnapshot } from "@/lib/admin/refund-partner-snapshot";

type Props = {
  partner: RefundPartnerSnapshot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RefundPartnerDetailSheet({ partner, open, onOpenChange }: Props) {
  if (!partner) return null;

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
      <SheetBody className="space-y-4">
        <PartnerProfileSummaryCard
          firstName={partner.firstName}
          lastName={partner.lastName}
          email={partner.email}
          status={partner.status}
          affiliation={partner.affiliation}
          memberSince={partner.memberSince}
          walletBalance={partner.walletBalance}
          priority={partner.priority}
          avatarUrl={partner.avatarUrl}
        />

        <div className="card overflow-hidden rounded-xl">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Delivery & filters</h2>
          </div>
          <dl className="space-y-2.5 px-5 py-4 text-sm">
            {[
              { label: "Deliveries", value: partner.deliveryCount.toLocaleString() },
              ...(partner.filterStates.length > 0
                ? [{ label: "Filter states", value: statesPreview }]
                : []),
            ].map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-slate-500">{row.label}</dt>
                <dd className="text-right font-semibold text-slate-900">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

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
