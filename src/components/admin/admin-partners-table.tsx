"use client";

import { useMemo } from "react";
import { PortalDataTable } from "@/components/ui/portal-data-table";
import type { PortalDataTableSortState } from "@/components/ui/portal-data-table";
import { PartnerTableRow } from "@/components/admin/partner-table-row";
import { PartnersColumnVisibilityMenu } from "@/components/admin/partners-column-visibility-menu";
import { usePartnersColumnVisibility } from "@/components/admin/use-partners-column-visibility";
import {
  isPartnerHideableColumnKey,
  PARTNER_TABLE_COLUMNS,
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
};

export function AdminPartnersTable({
  partners,
  sort,
}: {
  partners: AdminPartnerRow[];
  sort: PortalDataTableSortState;
}) {
  const { visibility, setColumnVisible } = usePartnersColumnVisibility();

  const columns = useMemo(() => {
    const visible = PARTNER_TABLE_COLUMNS.filter((col) => {
      if (col.key === "partner" || col.key === "actions") return true;
      if (isPartnerHideableColumnKey(col.key)) return visibility[col.key];
      return true;
    });

    return visible.map((col) =>
      col.key === "actions"
        ? {
            ...col,
            headerContent: (
              <PartnersColumnVisibilityMenu
                visibility={visibility}
                onToggle={setColumnVisible}
              />
            ),
          }
        : col,
    );
  }, [visibility, setColumnVisible]);

  return (
    <PortalDataTable columns={columns} sort={sort}>
      {partners.map((partner) => (
        <PartnerTableRow
          key={partner.id}
          partner={partner}
          columnVisibility={visibility}
        />
      ))}
    </PortalDataTable>
  );
}
