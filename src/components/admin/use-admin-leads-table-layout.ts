"use client";

import {
  ADMIN_LEADS_TABLE_LAYOUT_KEY,
  type AdminLeadsTableLayout,
} from "@/lib/admin/admin-leads-table-display";
import { usePortalDataTableLayout } from "@/hooks/use-portal-data-table-layout";

export function useAdminLeadsTableLayout() {
  return usePortalDataTableLayout(ADMIN_LEADS_TABLE_LAYOUT_KEY) as {
    layout: AdminLeadsTableLayout;
    setLayout: (next: AdminLeadsTableLayout) => void;
  };
}
