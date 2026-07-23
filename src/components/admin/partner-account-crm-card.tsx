import { endpointHostForDisplay } from "@/lib/delivery/outbound-url-guard";

type PartnerAccountCrmCardProps = {
  crmOutboundEnabled: boolean;
  crmOutboundEndpointUrl: string | null;
  crmOutboundMappingCount: number;
  walletBalance: number;
};

function ChecklistRow({
  title,
  subtitle,
  satisfied,
}: {
  title: string;
  subtitle?: string;
  satisfied: boolean;
}) {
  return (
    <div className="flex gap-3 py-2">
      <div
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          satisfied ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
        }`}
      >
        {satisfied ? "✓" : "·"}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-900">{title}</p>
        {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export function PartnerAccountCrmCard({
  crmOutboundEnabled,
  crmOutboundEndpointUrl,
  crmOutboundMappingCount,
  walletBalance,
}: PartnerAccountCrmCardProps) {
  const configured =
    crmOutboundEnabled &&
    Boolean(crmOutboundEndpointUrl?.trim()) &&
    crmOutboundMappingCount > 0;
  const host = crmOutboundEndpointUrl
    ? endpointHostForDisplay(crmOutboundEndpointUrl)
    : null;

  return (
    <div className="card rounded-xl p-5">
      <h2 className="text-sm font-semibold text-slate-900">Account readiness</h2>
      <p className="mt-1 text-xs text-slate-500">
        Email delivery is always on when Resend is configured. CRM POST is optional.
      </p>
      <div className="mt-4 divide-y divide-slate-100">
        <ChecklistRow
          title="Wallet funded"
          subtitle={walletBalance >= 25 ? "Ready for lead purchases" : "Balance below $25"}
          satisfied={walletBalance >= 25}
        />
        <ChecklistRow
          title="CRM outbound configured"
          subtitle={
            configured
              ? `Active — ${host} (${crmOutboundMappingCount} mappings)`
              : "Partner has not enabled CRM POST in Settings"
          }
          satisfied={configured}
        />
      </div>
    </div>
  );
}
