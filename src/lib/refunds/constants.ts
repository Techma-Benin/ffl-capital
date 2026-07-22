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

/** Clicking a decision badge again clears the filter. */
export function toggleRefundDecisionFilter(
  current: RefundDecisionFilter,
  decision: RefundDecisionValue,
): RefundDecisionFilter {
  return current === decision ? "all" : decision;
}

export type RefundStateFilter = "all" | (string & {});

export function matchesRefundStateFilter(
  state: string,
  filter: RefundStateFilter,
): boolean {
  return filter === "all" || state === filter;
}

/** Clicking a state chip again clears the filter. */
export function toggleRefundStateFilter(
  current: RefundStateFilter,
  state: string,
): RefundStateFilter {
  return current === state ? "all" : state;
}

export function refundDecisionLabel(
  decision: RefundDecisionValue | string,
): string {
  if (decision === "approved") return "Approved";
  if (decision === "rejected") return "Rejected";
  return decision;
}
