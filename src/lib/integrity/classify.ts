import { isNoCampaignAvailableReason, normalizeIntegrityReason } from "./no-campaign";

export type IntegrityFailureClass =
  | "retryable_no_campaign"
  | "terminal_business_rejection"
  | "operational_failure";

export type IntegrityClassificationInput = {
  outcome?: string | null;
  reason?: string | null;
  httpStatus?: number | null;
  isNetworkError?: boolean;
};

/**
 * Classify Integrity / LeadConduit failures for lifecycle routing.
 * Only normalized "No Campaign Available" business failures are retryable.
 * Transport / 429 / 5xx are operational (bounded technical retry, no permanent block).
 * All other business failures block the rejected Integrity mode only.
 */
export function classifyIntegrityFailure(
  input: IntegrityClassificationInput,
): IntegrityFailureClass {
  if (input.isNetworkError) {
    return "operational_failure";
  }

  const status = input.httpStatus ?? null;
  if (status === 429 || (status != null && status >= 500)) {
    return "operational_failure";
  }

  const reason = input.reason ?? "";
  if (reason && /^(Network error|HTTP \d{3}|Non-JSON response)/i.test(reason.trim())) {
    const httpMatch = reason.match(/^HTTP (\d{3})/i);
    if (httpMatch) {
      const code = Number(httpMatch[1]);
      if (code === 429 || code >= 500) return "operational_failure";
      // 4xx other than business body still treated as operational transport layer
      if (code >= 400) return "operational_failure";
    }
    if (/^Network error/i.test(reason.trim()) || /^Non-JSON/i.test(reason.trim())) {
      return "operational_failure";
    }
  }

  const outcome = (input.outcome ?? "").toLowerCase();
  if (outcome === "failure" || outcome === "error" || !outcome) {
    if (reason && isNoCampaignAvailableReason(reason)) {
      return "retryable_no_campaign";
    }
    if (outcome === "failure" || (reason && reason.trim().length > 0)) {
      return "terminal_business_rejection";
    }
  }

  if (reason && isNoCampaignAvailableReason(reason)) {
    return "retryable_no_campaign";
  }

  if (reason && reason.trim().length > 0) {
    return "terminal_business_rejection";
  }

  return "operational_failure";
}

export function formatIntegrityBlockReason(reason: string | null | undefined): string {
  if (!reason?.trim()) return "Terminal Integrity rejection";
  return normalizeIntegrityReason(reason);
}
