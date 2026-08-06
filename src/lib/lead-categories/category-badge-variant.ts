import type { BadgeVariant } from "@/components/ui/badge";
import {
  MULTIPLE_CATEGORY_MATCH_TYPE_FILTER,
  UNCLASSIFIED_TYPE_FILTER,
} from "@/lib/leads/list-view-schema";

export type LeadCategoryResolution = "matched" | "no_match" | "multiple_matches";

export type LeadCategoryBadgeInput = {
  leadType: string | null;
  categoryResolution?: LeadCategoryResolution;
  /** Fallback when resolution is unavailable (e.g. list rows). */
  leadTypeLabel?: string;
};

/** Stable mapping for known category types and filter sentinels. */
const KNOWN_CATEGORY_BADGE_VARIANTS: Record<string, BadgeVariant> = {
  traditional_iul: "blue",
  high_intent_iul: "sky",
  mortgage_protection: "indigo",
  final_expense: "cyan",
  [UNCLASSIFIED_TYPE_FILTER]: "steel",
  [MULTIPLE_CATEGORY_MATCH_TYPE_FILTER]: "teal",
};

const FALLBACK_BLUE_VARIANTS: BadgeVariant[] = [
  "blue",
  "sky",
  "indigo",
  "cyan",
  "teal",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function resolveLeadCategoryBadgeKey(
  input: LeadCategoryBadgeInput,
): string {
  if (input.categoryResolution === "multiple_matches") {
    return MULTIPLE_CATEGORY_MATCH_TYPE_FILTER;
  }

  if (input.categoryResolution === "no_match" || !input.leadType) {
    if (input.leadTypeLabel === "Multiple match") {
      return MULTIPLE_CATEGORY_MATCH_TYPE_FILTER;
    }
    return UNCLASSIFIED_TYPE_FILTER;
  }

  return input.leadType;
}

export function resolveLeadCategoryBadgeVariant(
  input: LeadCategoryBadgeInput,
): BadgeVariant {
  const key = resolveLeadCategoryBadgeKey(input);
  const known = KNOWN_CATEGORY_BADGE_VARIANTS[key];
  if (known) return known;

  return FALLBACK_BLUE_VARIANTS[hashString(key) % FALLBACK_BLUE_VARIANTS.length];
}
