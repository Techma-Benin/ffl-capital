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
