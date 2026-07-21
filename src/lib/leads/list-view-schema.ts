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
]);

export const adminLeadViewFiltersSchema = z.object({
  statusSlice: adminStatusSliceSchema.default("all"),
  state: z.string().length(2).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
});

export const partnerLeadViewFiltersSchema = z.object({
  filterSetId: z.string().uuid().optional().nullable(),
  locations: z.array(z.string()).optional(),
  channels: z.array(z.enum(["realtime", "aged"])).optional(),
  types: z.array(z.string()).optional(),
  statuses: z
    .array(z.enum(["active", "refund_pending", "refunded"]))
    .optional(),
});

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

export type AdminLeadViewFilters = z.infer<typeof adminLeadViewFiltersSchema>;
export type PartnerLeadViewFilters = z.infer<typeof partnerLeadViewFiltersSchema>;
export type LeadViewSort = z.infer<typeof leadViewSortSchema>;
export type LeadViewColumn = z.infer<typeof leadViewColumnSchema>;

export function parseAdminFilters(raw: unknown): AdminLeadViewFilters {
  return adminLeadViewFiltersSchema.parse(raw ?? {});
}

export function parsePartnerFilters(raw: unknown): PartnerLeadViewFilters {
  return partnerLeadViewFiltersSchema.parse(raw ?? {});
}
