"use client";

import { useMemo } from "react";
import { PortalDataTable, PortalDataTableCard } from "@/components/ui/portal-data-table";
import type { PortalDataTableSortState } from "@/components/ui/portal-data-table";
import { PartnerTableRow } from "@/components/admin/partner-table-row";
import { PartnersColumnVisibilityMenu } from "@/components/admin/partners-column-visibility-menu";
import { PartnersTableLayoutToggle } from "@/components/admin/partners-table-layout-toggle";
import { usePartnersColumnVisibility } from "@/components/admin/use-partners-column-visibility";
import { usePartnersTableLayout } from "@/components/admin/use-partners-table-layout";
import {
  isPartnerHideableColumnKey,
  PARTNER_TABLE_COLUMNS,
  PARTNER_TABLE_HEADER_ALIGN_TABLE,
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

export function AdminPartnersTableSection({
  partners,
  sort,
  pagination,
}: {
  partners: AdminPartnerRow[];
  sort: PortalDataTableSortState;
  pagination?: React.ReactNode;
}) {
  const { layout, setLayout } = usePartnersTableLayout();

  return (
    <PortalDataTableCard footer={layout === "cards" ? pagination : undefined}>
      <AdminPartnersTable
        partners={partners}
        sort={sort}
        layout={layout}
        onLayoutChange={setLayout}
        tableFooter={layout === "table" ? pagination : undefined}
      />
    </PortalDataTableCard>
  );
}

export function AdminPartnersTable({
  partners,
  sort,
  layout,
  onLayoutChange,
  tableFooter,
}: {
  partners: AdminPartnerRow[];
  sort: PortalDataTableSortState;
  layout: PartnersTableLayout;
  onLayoutChange: (layout: PartnersTableLayout) => void;
  tableFooter?: React.ReactNode;
}) {
  const { visibility, setColumnVisible } = usePartnersColumnVisibility();

  const columns = useMemo(() => {
    const visible = PARTNER_TABLE_COLUMNS.filter((col) => {
      if (col.key === "partner" || col.key === "actions") return true;
      if (isPartnerHideableColumnKey(col.key)) return visibility[col.key];
      return true;
    });

    return visible.map((col) => {
      const withLayoutHeader =
        layout === "table" && PARTNER_TABLE_HEADER_ALIGN_TABLE[col.key]
          ? {
              ...col,
              headerClassName: PARTNER_TABLE_HEADER_ALIGN_TABLE[col.key],
            }
          : col;

      if (col.key !== "actions") return withLayoutHeader;

      return {
        ...withLayoutHeader,
        headerContent: (
          <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:justify-center">
            <PartnersTableLayoutToggle layout={layout} onLayoutChange={onLayoutChange} />
            <PartnersColumnVisibilityMenu
              visibility={visibility}
              onToggle={setColumnVisible}
            />
          </div>
        ),
      };
    });
  }, [visibility, setColumnVisible, layout, onLayoutChange]);

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
