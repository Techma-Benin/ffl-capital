import type { FilterCriteria } from "@/lib/matching/types";

/** Attribution keys removed from filter-set / template UI — strip on save. */
const ATTRIBUTION_KEYS = [
  "source",
  "excludeSource",
  "subId",
  "excludeSubId",
  "pubId",
  "excludePubId",
  "boberdooLeadType",
] as const;

export function stripAttributionCriteria(
  criteria: FilterCriteria | null | undefined,
): FilterCriteria {
  if (!criteria || typeof criteria !== "object" || Array.isArray(criteria)) {
    return {};
  }
  const next: FilterCriteria = { ...criteria };
  for (const key of ATTRIBUTION_KEYS) {
    delete next[key];
  }
  return next;
}
