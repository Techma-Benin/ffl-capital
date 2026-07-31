import { z } from "zod";

export const leadViewSortSchema = z.object({
  field: z.string().min(1),
  direction: z.enum(["asc", "desc"]),
});

export const leadViewColumnSchema = z.object({
  key: z.string().min(1),
  visible: z.boolean(),
});

export const adminStatusSliceSchema = z.enum([
  "all",
  "matched",
  "unmatched",
  "integrity_posted",
  "aged_listed",
  "review",
]);

export const UNCLASSIFIED_TYPE_FILTER = "__unclassified__";
export const MULTIPLE_CATEGORY_MATCH_TYPE_FILTER =
  "__multiple_category_match__";

export const adminDatePeriodSchema = z.enum([
  "today",
  "yesterday",
  "last_7_days",
  "last_month",
  "custom",
]);

export type AdminDatePeriod = z.infer<typeof adminDatePeriodSchema>;

function preprocessAdminFilters(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw ?? {};
  const o = { ...(raw as Record<string, unknown>) };
  if ((o.from || o.to) && o.datePeriod == null) {
    o.datePeriod = "custom";
  }
  const legacyState = o.state;
  if (
    typeof legacyState === "string" &&
    legacyState.length === 2 &&
    o.states == null
  ) {
    o.states = [legacyState];
  }
  delete o.state;

  const migratedTypes = new Set(
    Array.isArray(o.types)
      ? o.types.filter((value): value is string => typeof value === "string")
      : [],
  );
  if (o.categoryResolution === "no_match") {
    migratedTypes.add(UNCLASSIFIED_TYPE_FILTER);
  } else if (o.categoryResolution === "multiple_matches") {
    migratedTypes.add(MULTIPLE_CATEGORY_MATCH_TYPE_FILTER);
  }
  if (Array.isArray(o.categoryCandidateTypes)) {
    for (const value of o.categoryCandidateTypes) {
      if (typeof value === "string" && value) migratedTypes.add(value);
    }
  }
  if (migratedTypes.size) o.types = Array.from(migratedTypes);
  delete o.categoryResolution;
  delete o.categoryCandidateTypes;
  return o;
}

function normalizeAdminFiltersForSave(
  f: z.infer<typeof adminLeadViewFiltersSchemaInner>,
): z.infer<typeof adminLeadViewFiltersSchemaInner> {
  let out = f;
  if (!out.states?.length) {
    const { states: _states, ...rest } = out;
    out = rest;
  }
  if (!out.types?.length) {
    const { types: _types, ...rest } = out;
    out = rest;
  }
  if (out.datePeriod && out.datePeriod !== "custom") {
    const { from: _from, to: _to, ...rest } = out;
    return rest;
  }
  if (!out.datePeriod) {
    const { from: _from, to: _to, ...rest } = out;
    return rest;
  }
  return out;
}

const adminLeadViewFiltersSchemaInner = z.object({
  statusSlice: adminStatusSliceSchema.default("all"),
  types: z.array(z.string().min(1)).optional(),
  filterSetId: z.string().uuid().optional().nullable(),
  states: z.array(z.string().length(2)).optional(),
  datePeriod: adminDatePeriodSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
});

export const adminLeadViewFiltersSchema = z.preprocess(
  preprocessAdminFilters,
  adminLeadViewFiltersSchemaInner.transform(normalizeAdminFiltersForSave),
);

const partnerLeadViewFiltersSchemaInner = z.object({
  filterSetId: z.string().uuid().optional().nullable(),
  locations: z.array(z.string()).optional(),
  channels: z.array(z.enum(["realtime", "aged"])).optional(),
  types: z.array(z.string()).optional(),
  statuses: z
    .array(z.enum(["active", "refund_pending", "refunded"]))
    .optional(),
  datePeriod: adminDatePeriodSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

function preprocessPartnerFilters(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw ?? {};
  const filters = { ...(raw as Record<string, unknown>) };
  if ((filters.from || filters.to) && filters.datePeriod == null) {
    filters.datePeriod = "custom";
  }
  return filters;
}

export const partnerLeadViewFiltersSchema = z.preprocess(
  preprocessPartnerFilters,
  partnerLeadViewFiltersSchemaInner.transform((filters) => {
    if (filters.datePeriod && filters.datePeriod !== "custom") {
      const { from: _from, to: _to, ...rest } = filters;
      return rest;
    }
    if (!filters.datePeriod) {
      const { from: _from, to: _to, ...rest } = filters;
      return rest;
    }
    return filters;
  }),
);

export const leadViewCreateSchema = z.object({
  name: z.string().min(1).max(100),
  filters: z.record(z.unknown()),
  sort: leadViewSortSchema,
  columns: z.array(leadViewColumnSchema).min(1),
  isDefault: z.boolean().optional(),
});

export const leadViewUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  filters: z.record(z.unknown()).optional(),
  sort: leadViewSortSchema.optional(),
  columns: z.array(leadViewColumnSchema).min(1).optional(),
});

export type AdminLeadViewFilters = z.infer<typeof adminLeadViewFiltersSchemaInner>;
export type PartnerLeadViewFilters = z.infer<
  typeof partnerLeadViewFiltersSchemaInner
>;
export type LeadViewSort = z.infer<typeof leadViewSortSchema>;
export type LeadViewColumn = z.infer<typeof leadViewColumnSchema>;

export function parseAdminFilters(raw: unknown): AdminLeadViewFilters {
  return adminLeadViewFiltersSchema.parse(raw ?? {});
}

export function parsePartnerFilters(raw: unknown): PartnerLeadViewFilters {
  return partnerLeadViewFiltersSchema.parse(raw ?? {});
}
