import { prisma } from "@/lib/db";
import {
  resolveLeadCategoryPresentation,
  type CategoryLabelSource,
  type LeadCategoryPresentation,
} from "@/lib/lead-categories/category-presentation";

export type { CategoryLabelSource, LeadCategoryPresentation };

export function buildCategoryLabelMap(
  categories: CategoryLabelSource[],
): Map<string, string> {
  return new Map(categories.map((category) => [category.type, category.label]));
}

export function buildCategoryFilterOptions(
  categories: CategoryLabelSource[],
): Array<{ value: string; label: string }> {
  return categories.map((category) => ({
    value: category.type,
    label: category.label,
  }));
}

export function resolveLeadTypeDisplay(input: {
  leadType: string | null;
  categoryResolution: "matched" | "no_match" | "multiple_matches";
  categoryCandidateTypes: string[];
  categories: CategoryLabelSource[];
}): LeadCategoryPresentation {
  return resolveLeadCategoryPresentation(input);
}

export async function loadEnabledCategoryLabels(): Promise<CategoryLabelSource[]> {
  return prisma.leadCategory.findMany({
    where: { enabled: true },
    select: { type: true, label: true },
    orderBy: { label: "asc" },
  });
}

export async function loadEnabledCategoriesWithCriteria() {
  return prisma.leadCategory.findMany({
    where: { enabled: true },
    select: {
      type: true,
      label: true,
      enabled: true,
      criteria: {
        select: { field: true, value: true },
      },
    },
    orderBy: { label: "asc" },
  });
}

export async function loadAllCategoryLabels(): Promise<CategoryLabelSource[]> {
  return prisma.leadCategory.findMany({
    select: { type: true, label: true },
    orderBy: { label: "asc" },
  });
}
