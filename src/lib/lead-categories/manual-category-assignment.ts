import { mapPayloadCriterionFields } from "@/lib/intake/map-payload-fields";

export type ReviewLead = {
  status: string;
  available: boolean;
  categoryResolution: "matched" | "no_match" | "multiple_matches";
  categoryCandidateTypes: string[];
  leadType: string | null;
  rawPayload: Record<string, unknown>;
};

export type AssignmentCategory = {
  type: string;
  label: string;
  enabled: boolean;
  criteria: Array<{ field: string; value: string }>;
};

export type AssignmentResult = {
  update: {
    leadType: string;
    categoryResolution: "matched";
    categoryCandidateTypes: string[];
    status: "unmatched";
    available: true;
    rawPayload: Record<string, unknown>;
    source?: string;
    intent?: string | null;
  };
  overwrittenCriteria: Array<{
    field: string;
    previousValue: unknown;
    nextValue: string;
  }>;
  requiresReprocess: true;
};

function assertEligibleReviewLead(lead: ReviewLead): void {
  if (lead.status !== "review") {
    throw new Error("Category assignment is only allowed for review leads");
  }
  if (
    lead.categoryResolution !== "no_match" &&
    lead.categoryResolution !== "multiple_matches"
  ) {
    throw new Error(
      "Category assignment is only allowed for unresolved review leads",
    );
  }
}

export function prepareManualCategoryAssignment(input: {
  lead: ReviewLead;
  category: AssignmentCategory;
}): AssignmentResult {
  const { lead, category } = input;

  assertEligibleReviewLead(lead);

  if (!category.enabled) {
    throw new Error("Category must be enabled");
  }

  const rawPayload = { ...lead.rawPayload };
  const overwrittenCriteria: AssignmentResult["overwrittenCriteria"] = [];

  for (const criterion of category.criteria) {
    const previousValue = Object.prototype.hasOwnProperty.call(
      rawPayload,
      criterion.field,
    )
      ? rawPayload[criterion.field]
      : undefined;
    if (previousValue !== criterion.value) {
      overwrittenCriteria.push({
        field: criterion.field,
        previousValue,
        nextValue: criterion.value,
      });
    }
    rawPayload[criterion.field] = criterion.value;
  }

  const mappedColumns = mapPayloadCriterionFields(rawPayload);

  return {
    update: {
      leadType: category.type,
      categoryResolution: "matched",
      categoryCandidateTypes: [category.type],
      status: "unmatched",
      available: true,
      rawPayload,
      ...mappedColumns,
    },
    overwrittenCriteria,
    requiresReprocess: true,
  };
}
