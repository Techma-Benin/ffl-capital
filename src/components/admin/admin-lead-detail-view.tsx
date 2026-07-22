"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Badge } from "@/components/ui/badge";
import { LeadReprocessButton } from "@/components/admin/lead-reprocess-button";
import { LeadRedeliverButton } from "@/components/admin/lead-redeliver-button";
import { AdminLeadRefundButton } from "@/components/admin/admin-lead-refund-button";
import { AdminLeadEditModal } from "@/components/admin/admin-lead-edit-form";
import { AdminLeadDeadButton } from "@/components/admin/admin-lead-dead-button";
import { RefundPartnerDetailSheet } from "@/components/admin/refund-partner-detail-sheet";
import type { RefundPartnerSnapshot } from "@/lib/admin/refund-partner-snapshot";
import { formatDateTime, formatDateTimeLong } from "@/lib/format-datetime";
import { formatUsd, formatUsdPlain } from "@/lib/format-money";
import { ArrowLeft, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";

const TABS = [
  { id: "contact", label: "Contact" },
  { id: "iul", label: "IUL" },
  { id: "compliance", label: "Compliance" },
  { id: "tracking", label: "Tracking" },
  { id: "events", label: "Events" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export type AdminLeadDetailDelivery = {
  id: string;
  channel: string;
  price: number;
  deliveredAt: string;
  refundedAt: string | null;
  partnerId: string;
  partnerName: string;
  partner: RefundPartnerSnapshot;
};

export type AdminLeadDetailTimelineItem = {
  at: string;
  label: string;
  detail: string;
};

export type AdminLeadDetailEvent = {
  id: string;
  type: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminLeadDetailLead = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  dob: string | null;
  age: string | null;
  status: string;
  available: boolean;
  refundable: boolean;
  leadType: string;
  leadTypeLabel: string;
  intent: string | null;
  haveIul: string | null;
  primaryGoal: string | null;
  stateYouCurrentlyLiveIn: string | null;
  boberdooLeadType: string | null;
  receivedAt: string;
  trustedformCertUrl: string | null;
  tcpaConsent: string | null;
  tcpaLanguage: string | null;
  leadidToken: string | null;
  source: string;
  landingPage: string | null;
  subId: string | null;
  pubId: string | null;
  externalId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  rawPayload: unknown;
};

export type AdminLeadDetailActions = {
  showReprocess: boolean;
  showRedeliver: boolean;
  excludePartnerId?: string;
  refundableDeliveryId?: string;
  showDead: boolean;
  editInitial: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string | null;
    city: string | null;
    state: string;
    zip: string | null;
    intent: string | null;
    haveIul: string | null;
    primaryGoal: string | null;
  };
};

export function AdminLeadDetailView({
  lead,
  deliveries,
  timeline,
  events,
  grossSold,
  actions,
}: {
  lead: AdminLeadDetailLead;
  deliveries: AdminLeadDetailDelivery[];
  timeline: AdminLeadDetailTimelineItem[];
  events: AdminLeadDetailEvent[];
  grossSold: number;
  actions: AdminLeadDetailActions;
}) {
  const [tab, setTab] = useState<TabId>("contact");
  const [partnerSheet, setPartnerSheet] = useState<RefundPartnerSnapshot | null>(
    null,
  );
  const [partnerSheetOpen, setPartnerSheetOpen] = useState(false);

  function openPartnerSheet(partner: RefundPartnerSnapshot) {
    setPartnerSheet(partner);
    setPartnerSheetOpen(true);
  }

  const receivedLabel = formatDateTimeLong(lead.receivedAt);
  const trustedFormLabel = lead.trustedformCertUrl ? "Certified" : "Missing";

  return (
    <div className="space-y-2.5">
      <header className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <h1 className="page-title">Lead detail</h1>
          <Link
            href="/admin/leads"
            className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700"
          >
            <ArrowLeft
              size={14}
              weight={ICON_WEIGHT_LINEAR}
              aria-hidden
              className="transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none"
            />
            Back to leads
          </Link>
        </div>
      </header>

      <div className="card space-y-2.5 p-3.5 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                {lead.firstName} {lead.lastName}
              </h2>
              <LeadStatusBadge status={lead.status} />
              <Badge variant="purple">{lead.leadTypeLabel}</Badge>
            </div>
            <p className="text-xs text-slate-500 sm:text-sm">
              {lead.phone} · {lead.state}
              {receivedLabel ? ` · Received ${receivedLabel}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
            {actions.showReprocess && <LeadReprocessButton leadId={lead.id} />}
            {actions.showRedeliver && (
              <LeadRedeliverButton
                leadId={lead.id}
                excludePartnerId={actions.excludePartnerId}
              />
            )}
            {actions.refundableDeliveryId && (
              <AdminLeadRefundButton
                leadId={lead.id}
                leadDeliveryId={actions.refundableDeliveryId}
              />
            )}
            <AdminLeadEditModal leadId={lead.id} initial={actions.editInitial} />
            {actions.showDead && <AdminLeadDeadButton leadId={lead.id} />}
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <KpiTile label="Deliveries" value={String(deliveries.length)} />
          <KpiTile
            label="Gross sold"
            value={formatUsd(grossSold)}
            valueClassName="text-emerald-600"
          />
          <KpiTile label="Refundable" value={lead.refundable ? "Yes" : "No"} />
          <KpiTile
            label="TrustedForm"
            value={trustedFormLabel}
            valueClassName={lead.trustedformCertUrl ? "text-orange-600" : undefined}
          />
        </div>
      </div>

      <div
        className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-page/95 px-1 py-2 backdrop-blur-sm"
        role="tablist"
        aria-label="Lead detail sections"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={clsx(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                active
                  ? "bg-orange-600 text-white shadow-sm"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <SectionCard title={tabTitle(tab)}>
            {tab === "contact" && <ContactPanel lead={lead} />}
            {tab === "iul" && <IulPanel lead={lead} />}
            {tab === "compliance" && <CompliancePanel lead={lead} />}
            {tab === "tracking" && <TrackingPanel lead={lead} />}
            {tab === "events" && <EventsPanel events={events} />}
          </SectionCard>

          <div className="card">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Partner deliveries
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Partner</th>
                    <th>Channel</th>
                    <th>Price</th>
                    <th>Delivered</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-400">
                        No deliveries yet
                      </td>
                    </tr>
                  ) : (
                    deliveries.map((d) => (
                      <tr key={d.id}>
                        <td className="p-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openPartnerSheet(d.partner);
                            }}
                            className="block w-full cursor-pointer px-3 py-2 text-left font-medium text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
                            aria-label={`View partner profile for ${d.partnerName}`}
                          >
                            {d.partnerName}
                          </button>
                        </td>
                        <td>
                          <Badge
                            variant={d.channel === "realtime" ? "green" : "purple"}
                          >
                            {d.channel}
                          </Badge>
                        </td>
                        <td className="font-medium text-slate-700">
                          {formatUsd(d.price)}
                        </td>
                        <td
                          className="text-xs text-slate-400"
                          suppressHydrationWarning
                        >
                          {formatDateTime(d.deliveredAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <SectionCard title="Timeline" className="lg:self-start">
          <ol className="space-y-3.5">
            {timeline.map((event, i) => (
              <li key={i} className="border-l-2 border-orange-200 pl-3">
                <p className="text-sm font-medium text-slate-900">{event.label}</p>
                <p className="text-xs text-slate-500">{event.detail}</p>
                <p
                  className="text-[10px] text-slate-400"
                  suppressHydrationWarning
                >
                  {formatDateTimeLong(event.at) ?? formatDateTime(event.at)}
                </p>
              </li>
            ))}
          </ol>
        </SectionCard>
      </div>

      <RefundPartnerDetailSheet
        partner={partnerSheet}
        open={partnerSheetOpen}
        onOpenChange={setPartnerSheetOpen}
      />

      {lead.rawPayload != null && (
        <details className="card p-4 sm:p-6">
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

function tabTitle(tab: TabId): string {
  const found = TABS.find((t) => t.id === tab);
  return found?.label ?? "Details";
}

function KpiTile({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-2.5 py-2">
      <p className={clsx("text-sm font-bold text-slate-900", valueClassName)}>
        {value}
      </p>
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
    </div>
  );
}

function SectionCard({
  title,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={clsx("card overflow-hidden", className)}>
      <div className="border-b border-slate-100 px-4 py-3.5 sm:px-[18px]">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className={bodyClassName ?? "p-4 sm:p-[18px]"}>{children}</div>
    </section>
  );
}

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
    <div className="flex justify-between gap-4 text-sm">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="text-right text-slate-900">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-600 hover:underline"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function DetailList({ children }: { children: ReactNode }) {
  return <dl className="space-y-2.5">{children}</dl>;
}

function ContactPanel({ lead }: { lead: AdminLeadDetailLead }) {
  return (
    <DetailList>
      <DetailRow label="Email" value={lead.email} />
      <DetailRow label="Phone" value={lead.phone} />
      <DetailRow label="Address" value={lead.address} />
      <DetailRow label="City" value={lead.city} />
      <DetailRow label="State" value={lead.state} />
      <DetailRow label="Zip" value={lead.zip} />
      <DetailRow label="DOB" value={lead.dob} />
      <DetailRow label="Age" value={lead.age} />
    </DetailList>
  );
}

function IulPanel({ lead }: { lead: AdminLeadDetailLead }) {
  return (
    <DetailList>
      <div className="flex justify-between gap-4 text-sm">
        <dt className="text-slate-500">Lead Type</dt>
        <dd>
          <Badge variant="purple">{lead.leadTypeLabel}</Badge>
        </dd>
      </div>
      <DetailRow label="Intent" value={lead.intent} />
      <DetailRow label="Have IUL" value={lead.haveIul} />
      <DetailRow label="Primary Goal" value={lead.primaryGoal} />
      <DetailRow label="State (live in)" value={lead.stateYouCurrentlyLiveIn} />
      <DetailRow label="Boberdoo Lead Type" value={lead.boberdooLeadType} />
      <DetailRow
        label="Received"
        value={formatDateTimeLong(lead.receivedAt) ?? undefined}
      />
    </DetailList>
  );
}

function CompliancePanel({ lead }: { lead: AdminLeadDetailLead }) {
  return (
    <DetailList>
      <DetailRow
        label="TrustedForm"
        value={lead.trustedformCertUrl ? "View certificate" : null}
        href={lead.trustedformCertUrl ?? undefined}
      />
      <DetailRow label="TCPA Consent" value={lead.tcpaConsent} />
      <DetailRow label="TCPA Language" value={lead.tcpaLanguage} />
      <DetailRow label="LeadiD Token" value={lead.leadidToken} />
    </DetailList>
  );
}

function TrackingPanel({ lead }: { lead: AdminLeadDetailLead }) {
  return (
    <DetailList>
      <DetailRow label="Source" value={lead.source} />
      <DetailRow
        label="Landing Page"
        value={lead.landingPage}
        href={lead.landingPage ?? undefined}
      />
      <DetailRow label="Sub ID" value={lead.subId} />
      <DetailRow label="Pub ID" value={lead.pubId} />
      <DetailRow label="External ID" value={lead.externalId} />
      <DetailRow label="IP Address" value={lead.ipAddress} />
      <DetailRow label="User Agent" value={lead.userAgent} />
    </DetailList>
  );
}

function EventsPanel({ events }: { events: AdminLeadDetailEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-400">No events recorded yet.</p>;
  }
  return (
    <ol className="space-y-3">
      {events.map((event) => {
        const isDeliveryEvent =
          event.type === "delivered" || event.type === "delivery_failed";
        const borderColor =
          event.type === "delivery_failed"
            ? "border-red-300"
            : event.type === "delivered"
              ? "border-green-300"
              : "border-orange-200";
        return (
          <li key={event.id} className={`border-l-2 ${borderColor} pl-3`}>
            <p
              className={`text-sm font-medium ${event.type === "delivery_failed" ? "text-red-700" : "text-slate-900"}`}
            >
              {formatEventType(event.type)}
              {event.payload?.step ? ` · ${String(event.payload.step)}` : ""}
            </p>
            {event.payload && !isDeliveryEvent && (
              <p className="text-xs text-slate-500">
                {formatEventPayload(event.payload)}
              </p>
            )}
            {event.payload && isDeliveryEvent && (
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700">
                  {formatEventPayload(event.payload)}
                </summary>
                <pre className="mt-2 overflow-x-auto rounded bg-slate-50 p-2 text-[11px] text-slate-700">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              </details>
            )}
            <p className="text-[10px] text-slate-400" suppressHydrationWarning>
              {formatDateTimeLong(event.createdAt)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function LeadStatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { variant: "green" | "yellow" | "red" | "blue" | "slate"; label: string }
  > = {
    delivered: { variant: "green", label: "Delivered" },
    unmatched: { variant: "yellow", label: "Unmatched" },
    integrity_posted: { variant: "blue", label: "Integrity" },
    aged_listed: { variant: "slate", label: "Aged" },
    dead: { variant: "red", label: "Dead" },
  };
  const c = config[status] ?? { variant: "slate" as const, label: status };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function formatEventType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatEventPayload(payload: Record<string, unknown>): string {
  const parts: string[] = [];
  if (payload.partnerId) parts.push(`Partner: ${payload.partnerId}`);
  if (payload.reason) parts.push(String(payload.reason));
  if (payload.channel) parts.push(`Channel: ${payload.channel}`);
  if (payload.price != null) parts.push(formatUsdPlain(payload.price));
  if (payload.from) parts.push(`From: ${payload.from}`);
  if (payload.to) parts.push(`To: ${payload.to}`);
  if (payload.toEmail && !payload.to) parts.push(`To: ${payload.toEmail}`);
  if (payload.resendMock != null) parts.push(`Mock: ${payload.resendMock}`);
  if (payload.resendMessageId) parts.push(`Resend ID: ${payload.resendMessageId}`);
  if (payload.error) parts.push(`Error: ${payload.error}`);
  if (payload.statusCode != null) parts.push(`Status: ${payload.statusCode}`);
  if (payload.emailSent != null)
    parts.push(`Email: ${payload.emailSent ? "sent" : "not sent"}`);
  if (payload.mode) parts.push(`Mode: ${payload.mode}`);
  if (parts.length > 0) return parts.join(" · ");
  return JSON.stringify(payload);
}
