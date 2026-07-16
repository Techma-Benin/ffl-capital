import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { LeadReprocessButton } from "@/components/admin/lead-reprocess-button";
import { LeadRedeliverButton } from "@/components/admin/lead-redeliver-button";
import { AdminLeadRefundButton } from "@/components/admin/admin-lead-refund-button";
import { AdminLeadEditModal } from "@/components/admin/admin-lead-edit-form";
import { AdminLeadDeadButton } from "@/components/admin/admin-lead-dead-button";
import { getLeadEvents } from "@/lib/leads/lead-events";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

function DetailRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null | undefined;
  href?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="text-right text-slate-900">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-6">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      <dl className="space-y-2 text-sm">{children}</dl>
    </div>
  );
}

export default async function AdminLeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      leadDeliveries: {
        include: { partner: true, refundRequests: true },
        orderBy: { deliveredAt: "desc" },
      },
      resalePostings: { orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!lead) notFound();

  const leadEvents = await getLeadEvents(params.id);

  const timeline = [
    {
      at: lead.receivedAt,
      label: "Lead received",
      detail: `Source: ${lead.source}`,
    },
    ...lead.leadDeliveries.map((d) => ({
      at: d.deliveredAt,
      label: `Delivered (${d.channel})`,
      detail: `${d.partner.firstName} ${d.partner.lastName} — $${Number(d.price).toFixed(2)}`,
    })),
    ...lead.leadDeliveries.flatMap((d) =>
      d.refundRequests.map((r) => ({
        at: r.createdAt,
        label: `Refund ${r.status}`,
        detail: `${r.refundType}${r.reason ? ` — ${r.reason}` : ""}`,
      })),
    ),
    ...lead.resalePostings.map((p) => ({
      at: p.postedAt ?? p.createdAt,
      label: `Integrity ${p.status}`,
      detail: p.externalRef ?? p.mode,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const leadTypeLabel =
    lead.leadType === "traditional_iul" ? "Traditional IUL" : "High Intent IUL";

  const latestDelivery = lead.leadDeliveries[0];
  const canRedeliver = lead.leadDeliveries.length > 0;
  const refundableDelivery = lead.leadDeliveries.find((d) => !d.refundedAt);

  return (
    <div>
      <PageHeader
        title={`${lead.firstName} ${lead.lastName}`}
        subtitle={`${lead.state} · ${lead.email}`}
        action={
          <div className="flex items-center gap-2">
            {lead.status === "unmatched" && lead.available && (
              <LeadReprocessButton leadId={lead.id} />
            )}
            {canRedeliver && (
              <LeadRedeliverButton
                leadId={lead.id}
                excludePartnerId={latestDelivery?.partnerId}
              />
            )}
            {refundableDelivery && (
              <AdminLeadRefundButton
                leadId={lead.id}
                leadDeliveryId={refundableDelivery.id}
              />
            )}
            {lead.status !== "dead" && (
              <AdminLeadDeadButton leadId={lead.id} />
            )}
            <AdminLeadEditModal
              leadId={lead.id}
              initial={{
                firstName: lead.firstName,
                lastName: lead.lastName,
                email: lead.email,
                phone: lead.phone,
                address: lead.address,
                city: lead.city,
                state: lead.state,
                zip: lead.zip,
                intent: lead.intent,
                haveIul: lead.haveIul,
                primaryGoal: lead.primaryGoal,
              }}
            />
            <Link href="/admin/leads" className="btn-secondary btn-sm inline-flex items-center gap-1">
              <ArrowLeft size={14} />
              Back
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
          <p className="mt-1 font-bold capitalize">{lead.status.replace("_", " ")}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Phone</p>
          <p className="mt-1 font-bold">{lead.phone}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Available</p>
          <p className="mt-1 font-bold">{lead.available ? "Yes" : "No"}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Refundable</p>
          <p className="mt-1 font-bold">{lead.refundable ? "Yes" : "No"}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DetailSection title="Contact">
          <DetailRow label="Email" value={lead.email} />
          <DetailRow label="Phone" value={lead.phone} />
          <DetailRow label="Address" value={lead.address} />
          <DetailRow label="City" value={lead.city} />
          <DetailRow label="State" value={lead.state} />
          <DetailRow label="Zip" value={lead.zip} />
          <DetailRow label="DOB" value={lead.dob} />
          <DetailRow label="Age" value={lead.age} />
        </DetailSection>

        <DetailSection title="IUL & Classification">
          <div className="flex justify-between">
            <dt className="text-slate-500">Lead Type</dt>
            <dd><Badge variant="blue">{leadTypeLabel}</Badge></dd>
          </div>
          <DetailRow label="Intent" value={lead.intent} />
          <DetailRow label="Have IUL" value={lead.haveIul} />
          <DetailRow label="Primary Goal" value={lead.primaryGoal} />
          <DetailRow label="State (live in)" value={lead.stateYouCurrentlyLiveIn} />
          <DetailRow label="Boberdoo Lead Type" value={lead.boberdooLeadType} />
          <DetailRow label="Received" value={new Date(lead.receivedAt).toLocaleString()} />
        </DetailSection>

        <DetailSection title="Compliance">
          <DetailRow label="TrustedForm" value={lead.trustedformCertUrl ? "View certificate" : null} href={lead.trustedformCertUrl ?? undefined} />
          <DetailRow label="TCPA Consent" value={lead.tcpaConsent} />
          <DetailRow label="TCPA Language" value={lead.tcpaLanguage} />
          <DetailRow label="LeadiD Token" value={lead.leadidToken} />
        </DetailSection>

        <DetailSection title="Tracking & Attribution">
          <DetailRow label="Source" value={lead.source} />
          <DetailRow label="Landing Page" value={lead.landingPage} href={lead.landingPage ?? undefined} />
          <DetailRow label="Sub ID" value={lead.subId} />
          <DetailRow label="Pub ID" value={lead.pubId} />
          <DetailRow label="External ID" value={lead.externalId} />
          <DetailRow label="IP Address" value={lead.ipAddress} />
          <DetailRow label="User Agent" value={lead.userAgent} />
        </DetailSection>

        <div className="card p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Event Log</h2>
          {leadEvents.length === 0 ? (
            <p className="text-sm text-slate-400">No events recorded yet.</p>
          ) : (
            <ol className="space-y-3">
              {leadEvents.map((event) => (
                <li key={event.id} className="border-l-2 border-brand-200 pl-3">
                  <p className="text-sm font-medium text-slate-900">
                    {formatEventType(event.type)}
                  </p>
                  {event.payload && (
                    <p className="text-xs text-slate-500">
                      {formatEventPayload(event.payload as Record<string, unknown>)}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400">
                    {new Date(event.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="card p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Delivery Timeline</h2>
          <ol className="space-y-3">
            {timeline.map((event, i) => (
              <li key={i} className="border-l-2 border-brand-200 pl-3">
                <p className="text-sm font-medium text-slate-900">{event.label}</p>
                <p className="text-xs text-slate-500">{event.detail}</p>
                <p className="text-[10px] text-slate-400">
                  {new Date(event.at).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {lead.rawPayload && (
        <details className="mt-6 card p-6">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">
            Raw Payload (audit trail)
          </summary>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-50 p-4 text-xs text-slate-700">
            {JSON.stringify(lead.rawPayload, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

function formatEventType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatEventPayload(payload: Record<string, unknown>): string {
  const parts: string[] = [];
  if (payload.partnerId) parts.push(`Partner: ${payload.partnerId}`);
  if (payload.reason) parts.push(String(payload.reason));
  if (payload.channel) parts.push(`Channel: ${payload.channel}`);
  if (payload.price != null) parts.push(`$${Number(payload.price).toFixed(2)}`);
  if (parts.length > 0) return parts.join(" · ");
  return JSON.stringify(payload);
}
