const INTEGRITY_EVENT_LABELS: Record<string, string> = {
  integrity_posted: "Posted",
  integrity_accepted: "Accepted",
  integrity_rejected: "Rejected",
  integrity_skipped: "Skipped",
  integrity_error: "Error",
  integrity_missing_fields: "Missing Fields",
  integrity_no_campaign: "No Campaign Available",
};

const INTEGRITY_OUTCOME_LABELS: Record<string, string> = {
  posted: "Posted",
  posted_test: "Posted (Test)",
  accepted: "Accepted",
  rejected: "Rejected",
  skipped: "Skipped",
  error: "Error",
  no_campaign_available: "No Campaign Available",
  attempt: "Attempt",
};

const RESALE_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  sold: "Sold",
  rejected: "Rejected",
  reconciled: "Reconciled",
};

export function formatIntegrityEventType(type: string): string {
  return INTEGRITY_EVENT_LABELS[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatIntegrityOutcome(outcome: string): string {
  return INTEGRITY_OUTCOME_LABELS[outcome] ?? outcome.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatResaleStatusLabel(status: string, outcome?: string | null): string {
  if (outcome === "no_campaign_available") {
    return "No Campaign Available";
  }
  return RESALE_STATUS_LABELS[status] ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function integrityTimelineLabel(
  postingStatus: string,
  eventType?: string | null,
): string {
  if (eventType === "integrity_no_campaign") {
    return "Integrity · No Campaign Available";
  }
  if (eventType && INTEGRITY_EVENT_LABELS[eventType]) {
    return `Integrity · ${INTEGRITY_EVENT_LABELS[eventType]}`;
  }
  return `Integrity · ${formatResaleStatusLabel(postingStatus)}`;
}
