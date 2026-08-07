import { LeadCategoryBadge } from "@/components/leads/lead-category-badge";
import type { LeadCategoryResolution } from "@/lib/lead-categories/category-badge-variant";
import { formatDateTimeLong } from "@/lib/format-datetime";
import {
  LeadDetailFieldList,
  LeadDetailFieldRow,
} from "@/components/leads/lead-detail-ui";
import type { LeadDetailPanelLead } from "@/components/leads/lead-detail-types";

export function LeadDetailContactPanel({ lead }: { lead: LeadDetailPanelLead }) {
  return (
    <LeadDetailFieldList>
      <LeadDetailFieldRow label="Email" value={lead.email} />
      <LeadDetailFieldRow label="Phone" value={lead.phone} />
      <LeadDetailFieldRow label="Address" value={lead.address} />
      <LeadDetailFieldRow label="City" value={lead.city} />
      <LeadDetailFieldRow label="State" value={lead.state} />
      <LeadDetailFieldRow label="Zip" value={lead.zip} />
      <LeadDetailFieldRow label="DOB" value={lead.dob} />
      <LeadDetailFieldRow label="Age" value={lead.age} />
    </LeadDetailFieldList>
  );
}

export function LeadDetailIulPanel({ lead }: { lead: LeadDetailPanelLead }) {
  return (
    <LeadDetailFieldList>
      <div className="flex justify-between gap-4 text-sm">
        <dt className="text-slate-500">Lead Type</dt>
        <dd>
          <LeadCategoryBadge
            leadType={lead.leadType ?? null}
            categoryResolution={lead.categoryResolution}
            leadTypeLabel={lead.leadTypeLabel}
          >
            {lead.leadTypeLabel}
          </LeadCategoryBadge>
        </dd>
      </div>
      <LeadDetailFieldRow label="Intent" value={lead.intent} />
      <LeadDetailFieldRow label="Have IUL" value={lead.haveIul} />
      <LeadDetailFieldRow label="Primary Goal" value={lead.primaryGoal} />
      <LeadDetailFieldRow
        label="State (live in)"
        value={lead.stateYouCurrentlyLiveIn}
      />
      {lead.boberdooLeadType != null && (
        <LeadDetailFieldRow
          label="Boberdoo Lead Type"
          value={lead.boberdooLeadType}
        />
      )}
      <LeadDetailFieldRow
        label="Received"
        value={formatDateTimeLong(lead.receivedAt) ?? undefined}
      />
    </LeadDetailFieldList>
  );
}

export function LeadDetailCompliancePanel({
  lead,
}: {
  lead: LeadDetailPanelLead;
}) {
  return (
    <LeadDetailFieldList>
      <LeadDetailFieldRow
        label="TrustedForm"
        value={lead.trustedformCertUrl ? "View certificate" : null}
        href={lead.trustedformCertUrl ?? undefined}
      />
      <LeadDetailFieldRow label="TCPA Consent" value={lead.tcpaConsent} />
      <LeadDetailFieldRow label="TCPA Language" value={lead.tcpaLanguage} />
      {lead.leadidToken != null && (
        <LeadDetailFieldRow label="LeadiD Token" value={lead.leadidToken} />
      )}
    </LeadDetailFieldList>
  );
}

export function LeadDetailTrackingPanel({
  lead,
}: {
  lead: LeadDetailPanelLead;
}) {
  return (
    <LeadDetailFieldList>
      <LeadDetailFieldRow label="Source" value={lead.source} />
      <LeadDetailFieldRow
        label="Landing Page"
        value={lead.landingPage}
        href={lead.landingPage ?? undefined}
      />
      <LeadDetailFieldRow label="Sub ID" value={lead.subId} />
      <LeadDetailFieldRow label="Pub ID" value={lead.pubId} />
      <LeadDetailFieldRow label="External ID" value={lead.externalId} />
      <LeadDetailFieldRow label="IP Address" value={lead.ipAddress} />
      <LeadDetailFieldRow label="User Agent" value={lead.userAgent} />
      {lead.routingPhase != null && (
        <LeadDetailFieldRow label="Routing phase" value={lead.routingPhase} />
      )}
      {lead.lastRoutingAttemptAt != null && (
        <LeadDetailFieldRow
          label="Last routing attempt"
          value={formatDateTimeLong(lead.lastRoutingAttemptAt) ?? undefined}
        />
      )}
      {lead.nextRoutingAttemptAt != null && (
        <LeadDetailFieldRow
          label="Next routing attempt"
          value={formatDateTimeLong(lead.nextRoutingAttemptAt) ?? undefined}
        />
      )}
      {lead.integrityBlockedReason != null && (
        <LeadDetailFieldRow
          label="Integrity block"
          value={lead.integrityBlockedReason}
        />
      )}
    </LeadDetailFieldList>
  );
}

export type LeadDetailPurchaseInfo = {
  channelLabel: string;
  priceLabel: string;
  filterSetName: string | null;
  deliveredLabel: string | null;
  refundedLabel?: string | null;
  refundTypeLabel?: string | null;
  refundStatusLabel?: string | null;
  refundRequestedLabel?: string | null;
};

export function LeadDetailPurchasePanel({
  purchase,
}: {
  purchase: LeadDetailPurchaseInfo;
}) {
  return (
    <LeadDetailFieldList>
      <LeadDetailFieldRow label="Channel" value={purchase.channelLabel} />
      <LeadDetailFieldRow label="Price" value={purchase.priceLabel} />
      <LeadDetailFieldRow label="Filter Set" value={purchase.filterSetName} />
      <LeadDetailFieldRow label="Delivered" value={purchase.deliveredLabel} />
      {purchase.refundedLabel && (
        <LeadDetailFieldRow label="Refunded" value={purchase.refundedLabel} />
      )}
      {purchase.refundTypeLabel && (
        <LeadDetailFieldRow label="Refund Type" value={purchase.refundTypeLabel} />
      )}
      {purchase.refundStatusLabel && (
        <LeadDetailFieldRow
          label="Refund Status"
          value={purchase.refundStatusLabel}
        />
      )}
      {purchase.refundRequestedLabel && (
        <LeadDetailFieldRow
          label="Refund Requested"
          value={purchase.refundRequestedLabel}
        />
      )}
    </LeadDetailFieldList>
  );
}
