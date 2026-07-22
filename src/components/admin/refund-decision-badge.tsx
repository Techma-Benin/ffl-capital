"use client";

import { clsx } from "clsx";
import { Badge } from "@/components/ui/badge";
import {
  REFUND_DECISION_VALUES,
  refundDecisionLabel,
  type RefundDecisionValue,
} from "@/lib/refunds/constants";

function variantForDecision(decision: string): "green" | "red" {
  return decision === "approved" ? "green" : "red";
}

export function RefundDecisionBadge({
  decision,
  filterActive,
  onFilterClick,
}: {
  decision: string;
  filterActive?: boolean;
  onFilterClick?: (decision: RefundDecisionValue) => void;
}) {
  const variant = variantForDecision(decision);
  const label = refundDecisionLabel(decision);
  const canFilter =
    onFilterClick != null &&
    REFUND_DECISION_VALUES.includes(decision as RefundDecisionValue);

  if (!canFilter) {
    return <Badge variant={variant}>{label}</Badge>;
  }

  const refundDecision = decision as RefundDecisionValue;

  return (
    <button
      type="button"
      aria-pressed={filterActive ?? false}
      aria-label={`Filter by ${label}`}
      onClick={(e) => {
        e.stopPropagation();
        onFilterClick(refundDecision);
      }}
      className={clsx(
        "inline-flex rounded-md transition-opacity focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        "aria-pressed:true:focus-visible:ring-0 aria-pressed:true:focus-visible:ring-offset-0",
        "cursor-pointer hover:opacity-90",
      )}
    >
      <Badge variant={variant} className="pointer-events-none">
        {label}
      </Badge>
    </button>
  );
}
