"use client";

import { clsx } from "clsx";
import { Badge } from "@/components/ui/badge";
import {
  REFUND_TYPES,
  refundTypeLabel,
  type RefundTypeValue,
} from "@/lib/refunds/constants";

function variantForType(type: string): "yellow" | "red" {
  return type === "wrong_filter" ? "yellow" : "red";
}

export function RefundTypeBadge({
  type,
  filterActive,
  onFilterClick,
}: {
  type: string;
  filterActive?: boolean;
  onFilterClick?: (type: RefundTypeValue) => void;
}) {
  const variant = variantForType(type);
  const label = refundTypeLabel(type);
  const canFilter =
    onFilterClick != null &&
    REFUND_TYPES.includes(type as RefundTypeValue);

  if (!canFilter) {
    return <Badge variant={variant}>{label}</Badge>;
  }

  const refundType = type as RefundTypeValue;

  return (
    <button
      type="button"
      aria-pressed={filterActive ?? false}
      aria-label={`Filter by ${label}`}
      onClick={(e) => {
        e.stopPropagation();
        onFilterClick(refundType);
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
