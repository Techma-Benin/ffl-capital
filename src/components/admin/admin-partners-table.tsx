"use client";

import { useMemo } from "react";
import { PortalDataTable } from "@/components/ui/portal-data-table";
import type { PortalDataTableSortState } from "@/components/ui/portal-data-table";
import { PartnerTableRow } from "@/components/admin/partner-table-row";
import {
  isPartnerHideableColumnKey,
  PARTNER_TABLE_COLUMNS,
  PARTNER_TABLE_HEADER_ALIGN_TABLE,
  type PartnersColumnVisibilityState,
  type PartnersTableLayout,
} from "@/lib/admin/partners-table-columns";

export type AdminPartnerRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  affiliation: string | null;
  status: string;
  priority: number;
  walletBalance: number;
  leadBuying: boolean;
  walletOk: boolean;
  leadsCount: number;
  avatarUrl?: string | null;
};

export function AdminPartnersTable({
  partners,
  sort,
  layout,
  visibility,
  tableFooter,
}: {
  partners: AdminPartnerRow[];
  sort: PortalDataTableSortState;
  layout: PartnersTableLayout;
  visibility: PartnersColumnVisibilityState;
  tableFooter?: React.ReactNode;
}) {
  const columns = useMemo(() => {
    const visible = PARTNER_TABLE_COLUMNS.filter((col) => {
      if (col.key === "partner" || col.key === "actions") return true;
      if (isPartnerHideableColumnKey(col.key)) return visibility[col.key];
      return true;
    });

    return visible.map((col) => {
      if (layout === "table" && PARTNER_TABLE_HEADER_ALIGN_TABLE[col.key]) {
        return {
          ...col,
          headerClassName: PARTNER_TABLE_HEADER_ALIGN_TABLE[col.key],
        };
      }
      return col;
    });
  }, [visibility, layout]);

  const rows = partners.map((partner) => (
    <PartnerTableRow
      key={partner.id}
      partner={partner}
      columnVisibility={visibility}
      layout={layout}
    />
  ));

  return (
    <PortalDataTable
      columns={columns}
      sort={sort}
      layout={layout}
      footer={tableFooter}
    >
      {rows}
    </PortalDataTable>
  );
}
