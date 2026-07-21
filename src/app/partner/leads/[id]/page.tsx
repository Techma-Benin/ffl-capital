import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import { Badge } from "@/components/ui/badge";
import { PartnerRefundButton } from "@/components/partner/partner-refund-button";
import { ArrowLeft, ShieldCheck, ShieldWarning, ICON_WEIGHT_LINEAR } from "@/lib/icons/ssr";

function DetailRow({
  label,
  value,
  href,
  mono,
}: {
  label: string;
  value: string | null | undefined | boolean;
  href?: string;
  mono?: boolean;
}) {
  if (value === null || value === undefined || value === "") return null;
  const display = typeof value === "boolean" ? (value ? "Yes" : "No") : value;
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-slate-50 last:border-0">
      <dt className="shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className={`text-right text-sm text-slate-900 ${mono ? "font-mono text-xs" : ""}`}>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
            {display as string}
          </a>
        ) : (
          String(display)
        )}
      </dd>
    </div>
  );
}

function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon && <span className="text-slate-400">{icon}</span>}
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      <dl>{children}</dl>
    </div>
  );
}

export default async function PartnerLeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const partnerId = await getPartnerId();
  if (!partnerId) redirect("/onboarding");

  const delivery = await prisma.leadDelivery.findUnique({
    where: { id: params.id },
    include: {
      lead: true,
      refundRequests: { orderBy: { createdAt: "desc" }, take: 1 },
      filterSet: { select: { name: true } },
    },
  });

  // Ensure this delivery belongs to the requesting partner
  if (!delivery || delivery.partnerId !== partnerId) notFound();

  const lead = delivery.lead;
  const refundReq = delivery.refundRequests[0] ?? null;
  const isRefunded = !!delivery.refundedAt;
  const canRefund = lead.refundable && !isRefunded && !refundReq;

  const channelLabel = delivery.channel === "realtime" ? "Real-time" : "Aged";
  const typeLabel = lead.leadType === "traditional_iul" ? "Traditional IUL" : "High Intent IUL";

  function formatDate(d: Date | string | null | undefined) {
    if (!d) return null;
    return new Date(d).toLocaleString("en-US", {
      month: "long", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function formatDob(d: string | null | undefined) {
    if (!d) return null;
    // DOB stored as string like "1980-05-12"
    try { return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); }
    catch { return d; }
  }

  return (
    <div>
      {/* Back link */}
      <div className="mb-4">
        <Link
          href="/partner/leads"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={14} weight={ICON_WEIGHT_LINEAR} />
          Back to My Leads
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {lead.firstName} {lead.lastName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{lead.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="blue">{typeLabel}</Badge>
          <Badge variant={delivery.channel === "realtime" ? "green" : "purple"}>{channelLabel}</Badge>
          {isRefunded ? (
            <Badge variant="slate">Refunded</Badge>
          ) : refundReq ? (
            <Badge variant="yellow">Refund {refundReq.status}</Badge>
          ) : (
            <Badge variant="green">Active</Badge>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Contact */}
        <Section title="Contact Information">
          <DetailRow label="Full Name" value={`${lead.firstName} ${lead.lastName}`} />
          <DetailRow label="Email" value={lead.email} href={`mailto:${lead.email}`} />
          <DetailRow label="Phone" value={lead.phone} href={`tel:${lead.phone}`} />
          <DetailRow label="Date of Birth" value={formatDob(lead.dob)} />
          <DetailRow label="Age" value={lead.age != null ? String(lead.age) : null} />
          <DetailRow label="Address" value={lead.address} />
          <DetailRow label="City" value={lead.city} />
          <DetailRow label="State" value={lead.state} />
          <DetailRow label="ZIP" value={lead.zip} />
        </Section>

        {/* Lead profile */}
        <Section title="Lead Profile">
          <DetailRow label="Lead Type" value={typeLabel} />
          <DetailRow label="Intent" value={lead.intent} />
          <DetailRow label="Has IUL" value={lead.haveIul} />
          <DetailRow label="Primary Goal" value={lead.primaryGoal} />
          <DetailRow label="State of Residence" value={lead.stateYouCurrentlyLiveIn} />
        </Section>

        {/* Purchase details */}
        <Section title="Purchase Details">
          <DetailRow label="Channel" value={channelLabel} />
          <DetailRow label="Price" value={`$${Number(delivery.price).toFixed(2)}`} />
          <DetailRow label="Filter Set" value={delivery.filterSet?.name ?? null} />
          <DetailRow label="Delivered" value={formatDate(delivery.deliveredAt)} />
          {isRefunded && <DetailRow label="Refunded" value={formatDate(delivery.refundedAt)} />}
          {refundReq && !isRefunded && (
            <>
              <DetailRow label="Refund Type" value={refundReq.refundType === "wrong_filter" ? "Wrong Filter" : "Invalid Phone"} />
              <DetailRow label="Refund Status" value={refundReq.status.charAt(0).toUpperCase() + refundReq.status.slice(1)} />
              <DetailRow label="Refund Requested" value={formatDate(refundReq.createdAt)} />
            </>
          )}
        </Section>

        {/* Compliance */}
        <Section title="Compliance">
          {lead.trustedformCertUrl ? (
            <div className="flex justify-between gap-4 py-2 border-b border-slate-50">
              <dt className="shrink-0 text-sm text-slate-500">TrustedForm</dt>
              <dd className="flex items-center gap-2">
                {lead.trustedformValid ? (
                  <ShieldCheck size={14} className="text-emerald-500" />
                ) : (
                  <ShieldWarning size={14} className="text-amber-500" />
                )}
                <a
                  href={lead.trustedformCertUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-600 hover:underline"
                >
                  View Certificate
                </a>
              </dd>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No TrustedForm certificate on this lead.</p>
          )}
          <DetailRow label="TCPA Consent" value={lead.tcpaConsent} />
          {lead.tcpaLanguage && (
            <div className="py-2 border-b border-slate-50 last:border-0">
              <dt className="text-sm text-slate-500 mb-1">TCPA Language</dt>
              <dd className="text-xs text-slate-700 leading-relaxed">{lead.tcpaLanguage}</dd>
            </div>
          )}
        </Section>
      </div>

      {/* Refund action */}
      {canRefund && (
        <div className="mt-5 card p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-900">Request a Refund</p>
            <p className="text-xs text-slate-500 mt-0.5">
              This lead is eligible for a refund. Select a reason and submit your request.
            </p>
          </div>
          <PartnerRefundButton leadDeliveryId={delivery.id} />
        </div>
      )}
    </div>
  );
}
