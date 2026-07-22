import type { PortalDataTableColumn } from "@/components/ui/portal-data-table";

export const ADMIN_PARTNERS_VISIBLE_COLUMNS_KEY = "admin-partners-visible-columns";
export const ADMIN_PARTNERS_TABLE_LAYOUT_KEY = "admin-partners-table-layout";

export type PartnersTableLayout = "cards" | "table";

export function parsePartnersTableLayout(value: unknown): PartnersTableLayout {
  return value === "table" ? "table" : "cards";
}

export const PARTNER_HIDEABLE_COLUMN_KEYS = [
  "affiliation",
  "status",
  "priority",
  "wallet",
  "leadBuying",
  "leads",
] as const;

export type PartnerHideableColumnKey =
  (typeof PARTNER_HIDEABLE_COLUMN_KEYS)[number];

export const PARTNER_COLUMN_TOGGLE_LABELS: Record<
  PartnerHideableColumnKey,
  string
> = {
  affiliation: "Affiliation",
  status: "Status",
  priority: "Priority",
  wallet: "Wallet",
  leadBuying: "Lead Buying",
  leads: "Leads Purchased",
};

export type PartnersColumnVisibilityState = Record<
  PartnerHideableColumnKey,
  boolean
>;

export function defaultPartnersColumnVisibility(): PartnersColumnVisibilityState {
  return {
    affiliation: true,
    status: true,
    priority: true,
    wallet: true,
    leadBuying: true,
    leads: true,
  };
}

export function parsePartnersColumnVisibility(
  raw: unknown,
): PartnersColumnVisibilityState {
  const defaults = defaultPartnersColumnVisibility();
  if (!raw || typeof raw !== "object") return defaults;
  const obj = raw as Record<string, unknown>;
  const next = { ...defaults };
  for (const key of PARTNER_HIDEABLE_COLUMN_KEYS) {
    if (typeof obj[key] === "boolean") {
      next[key] = obj[key];
    }
  }
  return next;
}

export const PARTNER_TABLE_COLUMNS: PortalDataTableColumn[] = [
  { key: "partner", label: "Partner", sortKey: "partner" },
  {
    key: "affiliation",
    label: "Affiliation",
    headerClassName: "text-center",
    sortKey: "affiliation",
  },
  {
    key: "status",
    label: "Status",
    headerClassName: "text-center",
    sortKey: "status",
  },
  {
    key: "priority",
    label: "Priority",
    headerClassName: "text-center",
    sortKey: "priority",
  },
  {
    key: "wallet",
    label: "Wallet",
    headerClassName: "text-right",
    sortKey: "wallet",
  },
  {
    key: "leadBuying",
    label: "Lead Buying",
    headerClassName: "text-center",
    sortKey: "leadBuying",
  },
  {
    key: "leads",
    label: "Leads Purchased",
    headerClassName: "text-center",
    sortKey: "leads",
  },
  { key: "actions", label: "", headerClassName: "w-12 text-center" },
];

/** Header alignment when partners table uses layout="table" (cards use column defaults). */
export const PARTNER_TABLE_HEADER_ALIGN_TABLE: Partial<
  Record<string, string>
> = {
  affiliation: "text-left",
  status: "text-center",
  priority: "text-center",
  wallet: "text-right",
  leadBuying: "text-center",
  leads: "text-right",
  actions: "w-12 text-center",
};

export function isPartnerHideableColumnKey(
  key: string,
): key is PartnerHideableColumnKey {
  return (PARTNER_HIDEABLE_COLUMN_KEYS as readonly string[]).includes(key);
}
