import type { PortalDataTableLayout } from "@/components/ui/portal-data-table";

export const ADMIN_LEADS_VISIBLE_COLUMNS_KEY = "admin-leads-visible-columns";
export const ADMIN_LEADS_TABLE_LAYOUT_KEY = "admin-leads-table-layout";

export type AdminLeadsTableLayout = PortalDataTableLayout;

export function parseAdminLeadsTableLayout(value: unknown): AdminLeadsTableLayout {
  return value === "table" ? "table" : "cards";
}

export const ADMIN_LEAD_HIDEABLE_COLUMN_KEYS = [
  "id",
  "phone",
  "state",
  "type",
  "status",
  "partner",
  "price",
  "received",
  "trustedform",
] as const;

export type AdminLeadHideableColumnKey =
  (typeof ADMIN_LEAD_HIDEABLE_COLUMN_KEYS)[number];

export const ADMIN_LEAD_COLUMN_TOGGLE_LABELS: Record<
  AdminLeadHideableColumnKey,
  string
> = {
  id: "ID",
  phone: "Phone",
  state: "State",
  type: "Type",
  status: "Status",
  partner: "Partner",
  price: "Price",
  received: "Received",
  trustedform: "TrustedForm",
};

export type AdminLeadsColumnVisibilityState = Record<
  AdminLeadHideableColumnKey,
  boolean
>;

export function defaultAdminLeadsColumnVisibility(): AdminLeadsColumnVisibilityState {
  return {
    id: true,
    phone: true,
    state: true,
    type: true,
    status: true,
    partner: true,
    price: true,
    received: true,
    trustedform: true,
  };
}

export function parseAdminLeadsColumnVisibility(
  raw: unknown,
): AdminLeadsColumnVisibilityState {
  const defaults = defaultAdminLeadsColumnVisibility();
  if (!raw || typeof raw !== "object") return defaults;
  const obj = raw as Record<string, unknown>;
  const next = { ...defaults };
  for (const key of ADMIN_LEAD_HIDEABLE_COLUMN_KEYS) {
    if (typeof obj[key] === "boolean") {
      next[key] = obj[key];
    }
  }
  return next;
}

export function isAdminLeadHideableColumnKey(
  key: string,
): key is AdminLeadHideableColumnKey {
  return (ADMIN_LEAD_HIDEABLE_COLUMN_KEYS as readonly string[]).includes(key);
}
