/** Strip escaped/outer quotes from LeadConduit reason strings for comparison. */
export function normalizeIntegrityReason(reason: string): string {
  return reason
    .replace(/\\"/g, '"')
    .replace(/^["']+|["']+$/g, "")
    .trim();
}

/** Detect LeadConduit "No Campaign Available" rejections (quotes/casing may vary). */
export function isNoCampaignAvailableReason(reason: string): boolean {
  const normalized = normalizeIntegrityReason(reason).toLowerCase();
  return normalized.includes("no campaign available");
}
