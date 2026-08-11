"use client";

/**
 * @deprecated Prefer `LeadPreviewSheet` from `@/components/leads/lead-preview-sheet`.
 * Thin wrapper kept for partner aged imports.
 */
import {
  LeadPreviewSheet,
  type LeadPreviewAnswer,
  type LeadPreviewModel,
} from "@/components/leads/lead-preview-sheet";

export type PartnerAgedLeadPreviewAnswer = LeadPreviewAnswer;

/** Partner aged marketplace row + preview payload (price required for purchase). */
export type PartnerAgedLeadPreview = LeadPreviewModel & {
  intent: string;
  price: number;
};

type Props = {
  lead: PartnerAgedLeadPreview | null;
  agedDays: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AgedLeadPreviewSheet({
  lead,
  agedDays,
  open,
  onOpenChange,
}: Props) {
  return (
    <LeadPreviewSheet
      lead={lead}
      open={open}
      onOpenChange={onOpenChange}
      title="Lead preview"
      agedDaysMin={agedDays}
    />
  );
}
