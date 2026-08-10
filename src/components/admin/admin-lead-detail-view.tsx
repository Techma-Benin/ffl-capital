"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Badge } from "@/components/ui/badge";
import { LeadCategoryBadge } from "@/components/leads/lead-category-badge";
import type { LeadCategoryResolution } from "@/lib/lead-categories/category-badge-variant";
import { LeadReprocessButton } from "@/components/admin/lead-reprocess-button";
import { useAdminReprocess } from "@/components/admin/use-admin-reprocess";
import { LeadRedeliverButton } from "@/components/admin/lead-redeliver-button";
import { AdminLeadRefundButton } from "@/components/admin/admin-lead-refund-button";
import { AdminLeadEditModal } from "@/components/admin/admin-lead-edit-form";
import { AdminLeadDeadButton } from "@/components/admin/admin-lead-dead-button";
import { RefundPartnerDetailSheet } from "@/components/admin/refund-partner-detail-sheet";
import type { RefundPartnerSnapshot } from "@/lib/admin/refund-partner-snapshot";
import { formatDateTime, formatDateTimeLong } from "@/lib/format-datetime";
import { formatUsd, moneyCellClass, moneyHeaderClassName, moneyStatValueClassName } from "@/lib/format-money";
import { LeadDetailEventsPanel } from "@/components/leads/lead-detail-events-panel";
import {
  LeadDetailCompliancePanel,
  LeadDetailContactPanel,
  LeadDetailIulPanel,
  LeadDetailTrackingPanel,
} from "@/components/leads/lead-detail-panels";
import { LeadDetailTimelineCard } from "@/components/leads/lead-detail-timeline";
import type {
  LeadDetailEvent,
  LeadDetailPanelLead,
  LeadDetailTimelineItem,
} from "@/components/leads/lead-detail-types";
import {
  LeadDetailKpiTile,
  LeadDetailPageHeader,
  LeadDetailSectionCard,
  LeadDetailSummaryCard,
  LeadDetailTabBar,
  LeadDetailTwoColumnLayout,
} from "@/components/leads/lead-detail-ui";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { CategoryPayloadViewer } from "@/components/leads/category-payload-viewer";
import {
  AdminLeadCategoryAssignPanel,
  type CategoryAssignmentOption,
} from "@/components/admin/admin-lead-category-assign-panel";
import type { DiagnosticField } from "@/lib/lead-categories/payload-diagnostics";

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

export type AdminLeadDetailTimelineItem = LeadDetailTimelineItem;
export type AdminLeadDetailEvent = LeadDetailEvent;

export type AdminLeadDetailLead = LeadDetailPanelLead & {
  id: string;
  status: string;
  liveSaleChannel?: string | null;
  available: boolean;
  refundable: boolean;
  leadType: string;
  categoryResolution?: LeadCategoryResolution;
  candidateLabels?: string[];
  categoryCandidateTypes?: string[];
  payloadDiagnostics?: DiagnosticField[];
  categoryAssignOptions?: CategoryAssignmentOption[];
  showCategoryAssign?: boolean;
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
  reprocessPartnerPickerEnabled,
}: {
  lead: AdminLeadDetailLead;
  deliveries: AdminLeadDetailDelivery[];
  timeline: AdminLeadDetailTimelineItem[];
  events: AdminLeadDetailEvent[];
  grossSold: number;
  actions: AdminLeadDetailActions;
  reprocessPartnerPickerEnabled: boolean;
}) {
  const [tab, setTab] = useState<TabId>("contact");
  const [partnerSheet, setPartnerSheet] = useState<RefundPartnerSnapshot | null>(
    null,
  );
  const [partnerSheetOpen, setPartnerSheetOpen] = useState(false);

  const { reprocessLeads, reprocessDialog, pending: reprocessPending } =
    useAdminReprocess({ reprocessPartnerPickerEnabled });

  function handleReprocess() {
    return reprocessLeads([lead.id]);
  }

  function openPartnerSheet(partner: RefundPartnerSnapshot) {
    setPartnerSheet(partner);
    setPartnerSheetOpen(true);
  }

  const receivedLabel = formatDateTimeLong(lead.receivedAt);
  const trustedFormLabel = lead.trustedformCertUrl ? "Certified" : "Missing";

  return (
    <div className="space-y-2.5">
      <LeadDetailPageHeader backHref="/admin/leads" backLabel="Back to leads" />

      <LeadDetailSummaryCard
        title={
          <h2 className="text-lg font-bold text-slate-900">
            {lead.firstName} {lead.lastName}
          </h2>
        }
        badges={
          <>
            <LeadStatusBadge
              status={lead.status}
              liveSaleChannel={lead.liveSaleChannel}
            />
            <LeadCategoryBadge
              leadType={lead.leadType || null}
              categoryResolution={lead.categoryResolution}
              leadTypeLabel={lead.leadTypeLabel}
            >
              {lead.leadTypeLabel}
            </LeadCategoryBadge>
            {lead.candidateLabels && lead.candidateLabels.length > 0 && (
              <>
                {lead.candidateLabels.map((label) => (
                  <Badge key={label} variant="yellow">
                    {label}
                  </Badge>
                ))}
              </>
            )}
          </>
        }
        subtitle={
          <>
            {lead.phone} · {lead.state}
            {receivedLabel ? ` · Received ${receivedLabel}` : ""}
          </>
        }
        actions={
          <>
            {actions.showReprocess && (
              <LeadReprocessButton
                pending={reprocessPending}
                onReprocess={handleReprocess}
              />
            )}
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
          </>
        }
        kpis={
          <>
            <LeadDetailKpiTile label="Deliveries" value={String(deliveries.length)} />
            <LeadDetailKpiTile
              label="Gross sold"
              value={formatUsd(grossSold)}
              valueClassName={clsx("text-emerald-600", moneyStatValueClassName)}
            />
            <LeadDetailKpiTile
              label="Refundable"
              value={lead.refundable ? "Yes" : "No"}
            />
            <LeadDetailKpiTile
              label="TrustedForm"
              value={trustedFormLabel}
              valueClassName={
                lead.trustedformCertUrl ? "text-orange-600" : undefined
              }
            />
          </>
        }
      />

      <LeadDetailTabBar tabs={TABS} activeId={tab} onSelect={setTab} />

      <LeadDetailTwoColumnLayout
        main={
          <>
            <LeadDetailSectionCard title={tabTitle(tab)}>
              {tab === "contact" && <LeadDetailContactPanel lead={lead} />}
              {tab === "iul" && <LeadDetailIulPanel lead={lead} />}
              {tab === "compliance" && <LeadDetailCompliancePanel lead={lead} />}
              {tab === "tracking" && <LeadDetailTrackingPanel lead={lead} />}
              {tab === "events" && <LeadDetailEventsPanel events={events} />}
            </LeadDetailSectionCard>

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
                      <th className={moneyHeaderClassName}>Price</th>
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
                          <td className={moneyCellClass("font-medium text-slate-700")}>
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

            {lead.showCategoryAssign && lead.categoryAssignOptions && (
              <AdminLeadCategoryAssignPanel
                leadId={lead.id}
                categories={lead.categoryAssignOptions}
                candidateTypes={lead.categoryCandidateTypes ?? []}
              />
            )}

            {lead.rawPayload != null && (
              <details className="card p-4 sm:p-6" open={lead.status === "review"}>
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                  Raw Payload (audit trail)
                </summary>
                <div className="mt-3">
                  {lead.payloadDiagnostics &&
                  typeof lead.rawPayload === "object" &&
                  lead.rawPayload !== null &&
                  !Array.isArray(lead.rawPayload) ? (
                    <CategoryPayloadViewer
                      payload={lead.rawPayload as Record<string, unknown>}
                      diagnosticFields={lead.payloadDiagnostics}
                      candidateLabels={lead.candidateLabels}
                    />
                  ) : (
                    <pre className="overflow-x-auto rounded-lg bg-slate-50 p-4 text-xs text-slate-700">
                      {JSON.stringify(lead.rawPayload, null, 2)}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </>
        }
        sidebar={
          <LeadDetailTimelineCard items={timeline} className="lg:self-start" />
        }
      />

      <RefundPartnerDetailSheet
        partner={partnerSheet}
        open={partnerSheetOpen}
        onOpenChange={setPartnerSheetOpen}
      />
      {reprocessDialog}
    </div>
  );
}

function tabTitle(tab: TabId): string {
  const found = TABS.find((t) => t.id === tab);
  return found?.label ?? "Details";
}
