import type { LeadViewColumn } from "@/lib/leads/list-view-schema";

export type LeadColumnDef = {
  key: string;
  label: string;
  sortable?: boolean;
  sortKey?: string;
  required?: boolean;
  headerClassName?: string;
};

export const ADMIN_LEAD_COLUMNS: LeadColumnDef[] = [
  { key: "id", label: "ID", sortable: true, sortKey: "id" },
  { key: "name", label: "Name", sortable: true, sortKey: "name" },
  { key: "phone", label: "Phone", sortable: true, sortKey: "phone" },
  { key: "state", label: "State", sortable: true, sortKey: "state" },
  { key: "type", label: "Type", sortable: true, sortKey: "leadType" },
  { key: "status", label: "Status", sortable: true, sortKey: "status" },
  { key: "partner", label: "Partner" },
  { key: "price", label: "Price" },
  { key: "received", label: "Received", sortable: true, sortKey: "receivedAt" },
  { key: "trustedform", label: "TrustedForm" },
  { key: "actions", label: "Actions", required: true, headerClassName: "text-right" },
];

export const PARTNER_LEAD_COLUMNS: LeadColumnDef[] = [
  { key: "select", label: "", required: true },
  { key: "name", label: "Lead", sortable: true, sortKey: "name" },
  { key: "contact", label: "Contact" },
  { key: "location", label: "Location", sortable: true, sortKey: "state" },
  { key: "type", label: "Type", sortable: true, sortKey: "type" },
  { key: "channel", label: "Channel", sortable: true, sortKey: "channel" },
  { key: "price", label: "Price", sortable: true, sortKey: "price" },
  { key: "status", label: "Status", sortable: true, sortKey: "status" },
  { key: "delivered", label: "Delivered", sortable: true, sortKey: "deliveredAt" },
  { key: "actions", label: "", required: true },
];

export function defaultAdminColumns(): LeadViewColumn[] {
  return ADMIN_LEAD_COLUMNS.map((c) => ({ key: c.key, visible: true }));
}

export function defaultPartnerColumns(): LeadViewColumn[] {
  return PARTNER_LEAD_COLUMNS.map((c) => ({ key: c.key, visible: true }));
}

export function mergeColumnsWithCatalog(
  catalog: LeadColumnDef[],
  stored: LeadViewColumn[],
): LeadViewColumn[] {
  const byKey = new Map(stored.map((c) => [c.key, c]));
  const ordered: LeadViewColumn[] = [];
  for (const col of stored) {
    if (catalog.some((d) => d.key === col.key)) ordered.push(col);
  }
  for (const def of catalog) {
    if (!byKey.has(def.key)) {
      ordered.push({ key: def.key, visible: true });
    }
  }
  return ordered.map((col) => {
    const def = catalog.find((d) => d.key === col.key);
    if (def?.required) return { ...col, visible: true };
    return col;
  });
}

export function visibleColumnKeys(columns: LeadViewColumn[]): string[] {
  return columns.filter((c) => c.visible).map((c) => c.key);
}

export function portalColumnsFromView(
  catalog: LeadColumnDef[],
  columns: LeadViewColumn[],
) {
  const merged = mergeColumnsWithCatalog(catalog, columns);
  const visible = new Set(visibleColumnKeys(merged));
  return catalog
    .filter((c) => visible.has(c.key))
    .sort(
      (a, b) =>
        merged.findIndex((x) => x.key === a.key) -
        merged.findIndex((x) => x.key === b.key),
    )
    .map((c) => ({
      key: c.key,
      label: c.label,
      headerClassName: c.headerClassName,
      sortKey: c.sortable ? c.sortKey ?? c.key : undefined,
    }));
}
