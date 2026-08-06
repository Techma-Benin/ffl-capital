export type ReprocessLeadState = {
  available: boolean;
  status: string;
  categoryResolution: "matched" | "no_match" | "multiple_matches";
  leadType: string | null;
};

export type ReprocessEligibility = {
  eligible: boolean;
  reason?: string;
};

export function getReprocessEligibility(
  lead: ReprocessLeadState,
): ReprocessEligibility {
  if (
    lead.categoryResolution === "no_match" ||
    lead.categoryResolution === "multiple_matches"
  ) {
    return {
      eligible: false,
      reason: "Lead has unresolved category — assign a category in review first",
    };
  }

  if (!lead.available) {
    return { eligible: false, reason: "Lead is not available" };
  }

  if (lead.status !== "unmatched") {
    return { eligible: false, reason: "Lead is not unmatched" };
  }

  if (!lead.leadType) {
    return { eligible: false, reason: "Lead has no category type" };
  }

  return { eligible: true };
}
