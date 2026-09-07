const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  top_up: "Top-up",
  admin_grant: "Admin Credit",
  admin_debit: "Admin Debit",
  lead_purchase: "Lead Purchase",
  aged_purchase: "Aged Purchase",
  refund: "Refund",
  reprocessing_fee: "Reprocess Fee",
};

/** Human-readable label for snake_case enum values (e.g. `refund` → Refund, `lead_purchase` → Lead Purchase). */
export function formatTypeLabel(raw: string): string {
  if (TRANSACTION_TYPE_LABELS[raw]) return TRANSACTION_TYPE_LABELS[raw];
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function deliveryChannelLabel(channel: string): string {
  return channel === "realtime" ? "Real-time" : "Aged";
}
