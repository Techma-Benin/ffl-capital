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

/**
 * Partner-column label for Integrity endpoint when a lead was posted to Integrity.
 * Status column keeps a plain "Integrity" badge; endpoint lives under Partner.
 */
export function formatIntegrityEndpointPartnerLabel(
  liveSaleChannel?: string | null,
): string | null {
  if (liveSaleChannel === "integrity_storefront") return "Storefront";
  if (liveSaleChannel === "integrity_realtime") return "RealTime";
  return null;
}

/**
 * Admin Partner-column display: RealTime/Storefront only for Integrity-sold
 * leads (`integrity_posted`); otherwise the partner name (or null).
 */
export function formatAdminLeadPartnerLabel(
  status: string,
  liveSaleChannel?: string | null,
  partnerName?: string | null,
): string | null {
  if (status === "integrity_posted") {
    const endpoint = formatIntegrityEndpointPartnerLabel(liveSaleChannel);
    if (endpoint) return endpoint;
  }
  return partnerName ?? null;
}

/** Human-readable admin lead status. Integrity destination is shown under Partner. */
export function formatLeadStatusLabel(
  status: string,
  integrityRejected = false,
): string {
  if (status === "unmatched" && integrityRejected) {
    return "Integrity - Rejected";
  }

  const base: Record<string, string> = {
    delivered: "Delivered",
    unmatched: "Unmatched",
    integrity_posted: "Integrity",
    dead: "Dead",
    review: "Review",
  };

  return base[status] ?? status;
}
