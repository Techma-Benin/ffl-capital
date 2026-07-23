import type { PortalDataTableLayout } from "@/components/ui/portal-data-table";
import { parsePortalDataTableLayout } from "@/hooks/use-portal-data-table-layout";

export const ADMIN_LEADS_TABLE_LAYOUT_KEY = "admin-leads-table-layout";

export type AdminLeadsTableLayout = PortalDataTableLayout;

export function parseAdminLeadsTableLayout(value: unknown): AdminLeadsTableLayout {
  return parsePortalDataTableLayout(value);
}
