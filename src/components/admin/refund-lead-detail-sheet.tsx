"use client";

/**
 * @deprecated Use `LeadPreviewSheet` + `leadPreviewFromRefundSnapshot` instead.
 * Kept as a thin adapter so any lingering imports still render the unified sheet.
 */
import { LeadPreviewSheet } from "@/components/leads/lead-preview-sheet";
import {
  leadPreviewFromRefundSnapshot,
  type RefundLeadSnapshot,
} from "@/lib/admin/refund-lead-snapshot";

type Props = {
  lead: RefundLeadSnapshot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  agedDaysMin?: number;
};

export function RefundLeadDetailSheet({
  lead,
  open,
  onOpenChange,
  title = "Lead",
  agedDaysMin,
}: Props) {
  return (
    <LeadPreviewSheet
      lead={lead ? leadPreviewFromRefundSnapshot(lead) : null}
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      agedDaysMin={agedDaysMin}
      showViewFullLead
    />
  );
}
