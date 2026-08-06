"use client";

import { clsx } from "clsx";
import { Badge } from "@/components/ui/badge";
import { LeadCategoryBadge } from "@/components/leads/lead-category-badge";
import { Sheet, SheetBody } from "@/components/ui/sheet";
import { Clock } from "@/lib/icons/client";
import { formatUsd, moneyValueClassName } from "@/lib/format-money";
import { partnerAgedLeadAgeDays } from "@/lib/admin/admin-aged-leads-filters";
import { getPartnerAgedLeadAgeChipClassNames } from "@/lib/partner/aged-lead-age-chip";

export type PartnerAgedLeadPreview = {
  id: string;
  firstName: string;
  lastName: string;
  state: string;
  address: string | null;
  leadType: string;
  leadTypeLabel: string;
  receivedAt: string;
  intent: string;
  haveIul: string | null;
  primaryGoal: string | null;
};

type Props = {
  lead: PartnerAgedLeadPreview | null;
  agedPrice: number;
  agedDays: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function displayValue(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  return value;
}

export function AgedLeadPreviewSheet({
  lead,
  agedPrice,
  agedDays,
  open,
  onOpenChange,
}: Props) {
  if (!lead) return null;

  const name = `${lead.firstName} ${lead.lastName}`.trim();
  const ageDays = partnerAgedLeadAgeDays(lead.receivedAt);
  const ageChip = getPartnerAgedLeadAgeChipClassNames(ageDays, agedDays);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Lead preview"
      description={`Marketplace preview for ${name}`}
    >
      <SheetBody className="space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold tracking-tight text-slate-900">{name}</p>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">
              {lead.state}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <LeadCategoryBadge leadType={lead.leadType || null}>
              {lead.leadTypeLabel}
            </LeadCategoryBadge>
            {lead.intent ? (
              <Badge variant={lead.leadType === "high_intent_iul" ? "green" : "yellow"}>
                {lead.intent}
              </Badge>
            ) : null}
            <span className={ageChip.chip}>
              <Clock size={12} className={ageChip.icon} aria-hidden />
              {ageDays} days old
            </span>
          </div>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Price", value: formatUsd(agedPrice), valueClassName: moneyValueClassName },
            { label: "Have IUL", value: displayValue(lead.haveIul) },
            { label: "Primary goal", value: displayValue(lead.primaryGoal) },
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

        {lead.address ? (
          <div className="rounded-xl border border-slate-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Address
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">{lead.address}</p>
          </div>
        ) : null}
      </SheetBody>
    </Sheet>
  );
}
