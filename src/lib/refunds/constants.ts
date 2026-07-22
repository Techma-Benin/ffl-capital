export const REFUND_TYPES = ["wrong_filter", "invalid_phone"] as const;
export type RefundTypeValue = (typeof REFUND_TYPES)[number];

export type RefundTypeFilter = "all" | RefundTypeValue;

export const REFUND_TYPE_FILTER_OPTIONS: {
  value: RefundTypeFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "wrong_filter", label: "Wrong Filter" },
  { value: "invalid_phone", label: "Invalid Phone" },
];

export function refundTypeLabel(type: RefundTypeValue | string): string {
  if (type === "wrong_filter") return "Wrong Filter";
  if (type === "invalid_phone") return "Invalid Phone";
  return type;
}

export function matchesRefundTypeFilter(
  refundType: string,
  filter: RefundTypeFilter,
): boolean {
  return filter === "all" || refundType === filter;
}

/** Clicking a type badge again clears the filter. */
export function toggleRefundTypeFilter(
  current: RefundTypeFilter,
  type: RefundTypeValue,
): RefundTypeFilter {
  return current === type ? "all" : type;
}

export const REFUND_DECISION_VALUES = ["approved", "rejected"] as const;
export type RefundDecisionValue = (typeof REFUND_DECISION_VALUES)[number];
export type RefundDecisionFilter = "all" | RefundDecisionValue;

export const REFUND_DECISION_FILTER_OPTIONS: {
  value: RefundDecisionFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export function matchesRefundDecisionFilter(
  status: string,
  filter: RefundDecisionFilter,
): boolean {
  return filter === "all" || status === filter;
}
