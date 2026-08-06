export const REFUND_TYPES = ["invalid_phone"] as const;
export type RefundTypeValue = (typeof REFUND_TYPES)[number];

export type RefundTypeFilter = "all" | RefundTypeValue;

export const REFUND_TYPE_FILTER_OPTIONS: {
  value: RefundTypeFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "invalid_phone", label: "Invalid Phone" },
];

export function refundTypeLabel(type: RefundTypeValue | string): string {
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

/** Empty array means no state filter (show all). */
export type RefundStateFilter = string[];

export function isRefundStateFilterActive(filter: RefundStateFilter): boolean {
  return filter.length > 0;
}

export function matchesRefundStateFilter(
  state: string,
  filter: RefundStateFilter,
): boolean {
  return filter.length === 0 || filter.includes(state);
}

/** Clicking a state chip toggles that state in the filter set. */
export function toggleRefundStateFilter(
  current: RefundStateFilter,
  state: string,
): RefundStateFilter {
  if (current.includes(state)) {
    return current.filter((s) => s !== state);
  }
  return [...current, state];
}

export function refundDecisionLabel(
  decision: RefundDecisionValue | string,
): string {
  if (decision === "approved") return "Approved";
  if (decision === "rejected") return "Rejected";
  return decision;
}
