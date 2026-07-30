import { evaluateLeadCategories } from "@/lib/lead-categories/flexible-lead-categories";
import type { LeadCategoryRule } from "@/lib/lead-categories/flexible-lead-categories";

export type ImportClassification = {
  leadType: string | null;
  categoryResolution: "matched" | "no_match" | "multiple_matches";
  categoryCandidateTypes: string[];
  status: "unmatched" | "review";
  available: boolean;
};

export function classifyImportedLead(
  payload: Record<string, unknown>,
  categories: LeadCategoryRule[],
): ImportClassification {
  const result = evaluateLeadCategories(payload, categories);

  const categoryResolution =
    result.outcome === "one"
      ? "matched"
      : result.outcome === "zero"
        ? "no_match"
        : "multiple_matches";

  return {
    leadType: result.categoryType,
    categoryResolution,
    categoryCandidateTypes: result.matchedTypes,
    status: result.status,
    available: result.available,
  };
}
