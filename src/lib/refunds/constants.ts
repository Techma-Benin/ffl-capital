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
