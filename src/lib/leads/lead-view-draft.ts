import {
  adminLeadViewFiltersSchema,
  leadViewColumnSchema,
  partnerLeadViewFiltersSchema,
  type LeadViewColumn,
} from "@/lib/leads/list-view-schema";

export type LeadViewDraftScope = "admin" | "partner";

export type LeadViewDraft = {
  name: string;
  filters: object;
  columns: LeadViewColumn[];
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

export function normalizeLeadViewDraft(
  scope: LeadViewDraftScope,
  draft: LeadViewDraft,
): LeadViewDraft {
  const filters =
    scope === "admin"
      ? adminLeadViewFiltersSchema.parse(draft.filters)
      : partnerLeadViewFiltersSchema.parse(draft.filters);

  return {
    name: draft.name.trim(),
    filters,
    columns: leadViewColumnSchema.array().min(1).parse(draft.columns),
  };
}

export function leadViewDraftsEqual(
  scope: LeadViewDraftScope,
  a: LeadViewDraft,
  b: LeadViewDraft,
) {
  return (
    JSON.stringify(stableValue(normalizeLeadViewDraft(scope, a))) ===
    JSON.stringify(stableValue(normalizeLeadViewDraft(scope, b)))
  );
}

export function serializeLeadViewDraft(draft: LeadViewDraft) {
  return JSON.stringify(draft);
}

export function parseLeadViewDraft(
  scope: LeadViewDraftScope,
  raw: string | undefined,
): LeadViewDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LeadViewDraft;
    if (
      typeof parsed.name !== "string" ||
      !parsed.filters ||
      !Array.isArray(parsed.columns)
    ) {
      return null;
    }
    return normalizeLeadViewDraft(scope, parsed);
  } catch {
    return null;
  }
}

/** True when an applied draft differs from the last persisted view state. */
export function hasUnsavedAppliedLeadViewDraft(
  scope: LeadViewDraftScope,
  appliedDraft: LeadViewDraft | null | undefined,
  persisted: LeadViewDraft,
): boolean {
  return (
    !!appliedDraft && !leadViewDraftsEqual(scope, appliedDraft, persisted)
  );
}

/** URL that drops the draft param and keeps the active view (revert applied changes). */
export function buildLeadViewUrlWithoutDraft(
  basePath: string,
  viewId: string,
  search: string,
): string {
  const params = new URLSearchParams(search);
  params.set("view", viewId);
  params.delete("page");
  params.delete("draft");
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
