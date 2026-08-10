/** Human-readable admin lead status, including Integrity destination when known. */
export function formatLeadStatusLabel(
  status: string,
  liveSaleChannel?: string | null,
): string {
  const base: Record<string, string> = {
    delivered: "Delivered",
    unmatched: "Unmatched",
    integrity_posted: "Integrity",
    aged_listed: "Aged",
    dead: "Dead",
    review: "Review",
  };

  if (status === "integrity_posted") {
    if (liveSaleChannel === "integrity_storefront") {
      return "Integrity · Storefront";
    }
    if (liveSaleChannel === "integrity_realtime") {
      return "Integrity · RealTime";
    }
    return "Integrity";
  }

  return base[status] ?? status;
}
