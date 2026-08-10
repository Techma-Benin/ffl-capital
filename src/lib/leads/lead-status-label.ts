/**
 * Map live-sale channel or ResalePosting.mode → Integrity channel key for badges.
 * Posted implies done on our side — callers may pass any posting mode (not only sold).
 */
export function resolveIntegrityLiveSaleChannel(
  liveSaleChannel?: string | null,
  resaleMode?: string | null,
): string | null {
  if (
    liveSaleChannel === "integrity_storefront" ||
    liveSaleChannel === "integrity_realtime"
  ) {
    return liveSaleChannel;
  }
  if (resaleMode === "storefront") return "integrity_storefront";
  if (resaleMode === "realtime") return "integrity_realtime";
  return null;
}

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
