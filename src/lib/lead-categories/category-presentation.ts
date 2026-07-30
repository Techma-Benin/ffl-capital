export type CategoryLabelSource = {
  type: string;
  label: string;
};

export type LeadCategoryPresentation = {
  label: string;
  candidateLabels: string[];
};

export function resolveLeadCategoryPresentation(input: {
  leadType: string | null;
  categoryResolution: "matched" | "no_match" | "multiple_matches";
  categoryCandidateTypes: string[];
  categories: CategoryLabelSource[];
}): LeadCategoryPresentation {
  const labelByType = new Map(
    input.categories.map((category) => [category.type, category.label]),
  );

  if (input.categoryResolution === "multiple_matches") {
    return {
      label: "Multiple match",
      candidateLabels: input.categoryCandidateTypes.map(
        (type) => labelByType.get(type) ?? type,
      ),
    };
  }

  if (input.categoryResolution === "no_match" || !input.leadType) {
    return { label: "Unclassified", candidateLabels: [] };
  }

  return {
    label: labelByType.get(input.leadType) ?? input.leadType,
    candidateLabels: [],
  };
}
