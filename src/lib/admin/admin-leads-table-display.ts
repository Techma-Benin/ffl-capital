import type { PortalDataTableLayout } from "@/components/ui/portal-data-table";

export const ADMIN_LEADS_TABLE_LAYOUT_KEY = "admin-leads-table-layout";

export type AdminLeadsTableLayout = PortalDataTableLayout;

export function parseAdminLeadsTableLayout(value: unknown): AdminLeadsTableLayout {
  return value === "table" ? "table" : "cards";
}
