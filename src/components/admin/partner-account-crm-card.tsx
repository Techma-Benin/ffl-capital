"use client";

import { Badge } from "@/components/ui/badge";
import { usePartnerDetailEdit } from "@/components/admin/partner-detail-edit-provider";

type PartnerAccountCrmCardProps = {
  crmProvider: string;
  crmWebhookUrl: string | null;
  ringySid: string | null;
  ringyAuthToken: string | null;
  walletBalance: number;
};

function ComplianceRow({
  title,
  detail,
  satisfied,
}: {
  title: string;
  detail: string;
  satisfied: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3.5 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
      </div>
      <Badge variant={satisfied ? "green" : "red"} className="shrink-0">
        {satisfied ? "Satisfied" : "Not satisfied"}
      </Badge>
    </div>
  );
}

export function PartnerAccountCrmCard({
  crmProvider,
  crmWebhookUrl,
  ringySid,
  ringyAuthToken,
  walletBalance,
}: PartnerAccountCrmCardProps) {
  const { openPartnerEdit } = usePartnerDetailEdit();
  const needsWebhook = crmProvider === "webhook";
  const webhookOk = !needsWebhook || Boolean(crmWebhookUrl?.trim());
  const needsRingy = crmProvider === "ringy";
  const ringyOk =
    !needsRingy || Boolean(ringySid?.trim() && ringyAuthToken?.trim());
  const walletOk = walletBalance >= 25;

  return (
    <div className="card overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Account & CRM</h2>
        <button
          type="button"
          onClick={openPartnerEdit}
          className="text-xs font-medium text-slate-500 transition-colors hover:text-brand-600"
        >
          Edit
        </button>
      </div>
      <div className="px-5 pb-2">
        <ComplianceRow
          title="CRM webhook configured"
          detail={
            needsWebhook
              ? "Webhook provider requires a valid URL"
              : crmProvider === "ringy"
                ? "Ringy delivery — webhook not required"
                : "Email-only delivery"
          }
          satisfied={webhookOk}
        />
        <ComplianceRow
          title="Ringy credentials"
          detail={
            needsRingy
              ? "SID and auth token must be set"
              : "Not applicable for this CRM provider"
          }
          satisfied={ringyOk}
        />
        <ComplianceRow
          title="Wallet ≥ $25"
          detail="Minimum balance for lead purchasing"
          satisfied={walletOk}
        />
      </div>
    </div>
  );
}
