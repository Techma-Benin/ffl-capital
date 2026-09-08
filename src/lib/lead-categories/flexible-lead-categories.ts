import { z } from "zod";

export type LeadCategoryCriterion = {
  field: string;
  value: string;
};

export type LeadCategoryRule = {
  type: string;
  label: string;
  enabled: boolean;
  criteria: LeadCategoryCriterion[];
};

export type CategoryEvaluationOutcome = {
  outcome: "one" | "zero" | "multiple";
  matchedTypes: string[];
  categoryType: string | null;
  status: "unmatched" | "review";
  available: boolean;
  proceedToPartnerMatching: boolean;
  proceedToIntegrity: boolean;
};

const criterionSchema = z.object({
  field: z.string().trim().min(1),
  value: z.string().min(1),
}).strict();

const criteriaSchema = z.array(criterionSchema).min(1).superRefine((criteria, ctx) => {
  const fields = new Set<string>();
  criteria.forEach((criterion, index) => {
    if (fields.has(criterion.field)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Criterion field names must be unique within a category",
        path: [index, "field"],
      });
    }
    fields.add(criterion.field);
  });
});

export const categoryCreateSchema = z
  .object({
    label: z.string().trim().min(1),
    criteria: criteriaSchema,
    defaultPrice: z.number().positive().nullable().optional(),
    enabled: z.boolean().optional(),
    partnerEnabled: z.boolean().optional(),
    integrityLabel: z.string().trim().min(1).nullable().optional(),
    integrityLabelStorefront: z.string().trim().min(1).nullable().optional(),
  })
  .strict();

export const categoryUpdateSchema = z
  .object({
    label: z.string().trim().min(1).optional(),
    criteria: criteriaSchema.optional(),
    defaultPrice: z.number().positive().nullable().optional(),
    enabled: z.boolean().optional(),
    partnerEnabled: z.boolean().optional(),
    integrityLabel: z.string().trim().min(1).nullable().optional(),
    integrityLabelStorefront: z.string().trim().min(1).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export function labelToSnakeCase(label: string): string {
  return label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function deriveCategoryType(input: {
  label: string;
  existingType?: string;
  occupiedTypes?: string[];
}): string {
  if (input.existingType) {
    return input.existingType;
  }

  const generated = labelToSnakeCase(input.label);
  if (!generated) {
    throw new Error("Label must produce a valid internal type");
  }

  const occupied = input.occupiedTypes ?? [];
  if (occupied.includes(generated)) {
    throw new Error(
      `Internal type collision: "${generated}" already exists`,
    );
  }

  return generated;
}

function payloadValueMatches(
  payload: Record<string, unknown>,
  field: string,
  value: string,
): boolean {
  if (!Object.prototype.hasOwnProperty.call(payload, field)) return false;
  const actual = payload[field];
  return typeof actual === "string" && actual === value;
}

function categoryMatches(
  payload: Record<string, unknown>,
  category: LeadCategoryRule,
): boolean {
  return category.criteria.length > 0 && category.criteria.every((criterion) =>
    payloadValueMatches(payload, criterion.field, criterion.value),
  );
}

function buildOutcome(
  outcome: CategoryEvaluationOutcome["outcome"],
  matchedTypes: string[],
): CategoryEvaluationOutcome {
  const isAnomaly = outcome === "zero" || outcome === "multiple";

  return {
    outcome,
    matchedTypes,
    categoryType: outcome === "one" ? matchedTypes[0]! : null,
    status: isAnomaly ? "review" : "unmatched",
    available: !isAnomaly,
    proceedToPartnerMatching: !isAnomaly,
    proceedToIntegrity: !isAnomaly,
  };
}

export function evaluateLeadCategories(
  payload: Record<string, unknown>,
  categories: LeadCategoryRule[],
): CategoryEvaluationOutcome {
  const matchedTypes = categories
    .filter((category) => category.enabled)
    .filter((category) => categoryMatches(payload, category))
    .map((category) => category.type);

  if (matchedTypes.length === 0) {
    return buildOutcome("zero", []);
  }
  if (matchedTypes.length === 1) {
    return buildOutcome("one", matchedTypes);
  }
  return buildOutcome("multiple", matchedTypes);
}
