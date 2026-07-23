"use client";

import { clsx } from "clsx";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetBody } from "@/components/ui/sheet";
import { Clock } from "@/lib/icons/client";
import { formatUsd, moneyValueClassName } from "@/lib/format-money";
import { partnerAgedLeadAgeDays } from "@/lib/admin/admin-aged-leads-filters";

export type PartnerAgedLeadPreview = {
  id: string;
  firstName: string;
  lastName: string;
  state: string;
  address: string | null;
  leadType: string;
  receivedAt: string;
  intent: string;
  haveIul: string | null;
  primaryGoal: string | null;
};

type Props = {
  lead: PartnerAgedLeadPreview | null;
  agedPrice: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function leadTypeLabel(leadType: string): string {
  return leadType === "traditional_iul" ? "Traditional IUL" : "High Intent IUL";
}

function displayValue(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  return value;
}

export function AgedLeadPreviewSheet({ lead, agedPrice, open, onOpenChange }: Props) {
  if (!lead) return null;

  const name = `${lead.firstName} ${lead.lastName}`.trim();
  const ageDays = partnerAgedLeadAgeDays(lead.receivedAt);

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
            <Badge variant="blue">{leadTypeLabel(lead.leadType)}</Badge>
            {lead.intent ? (
              <Badge variant={lead.leadType === "high_intent_iul" ? "green" : "yellow"}>
                {lead.intent}
              </Badge>
            ) : null}
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <Clock size={12} className="text-slate-400" />
              <span className="font-medium">{ageDays} days old</span>
            </div>
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

        <p className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-xs leading-relaxed text-slate-600">
          Email, phone, and other contact details are available after you purchase this lead.
        </p>
      </SheetBody>
    </Sheet>
  );
}
