"use client";

import { Users } from "@/lib/icons/client";
import { EmptyState } from "@/components/ui/empty-state";
import { PortalDataTableCard } from "@/components/ui/portal-data-table";
import type { PortalDataTableSortState } from "@/components/ui/portal-data-table";
import type { PortalDataTableTabConfig } from "@/components/ui/portal-data-table";
import { AdminPartnersFilterBar } from "@/components/admin/admin-partners-filter-bar";
import {
  AdminPartnersTable,
  type AdminPartnerRow,
} from "@/components/admin/admin-partners-table";
import { PartnersColumnVisibilityMenu } from "@/components/admin/partners-column-visibility-menu";
import { PartnersTableLayoutToggle } from "@/components/admin/partners-table-layout-toggle";
import { usePartnersColumnVisibility } from "@/components/admin/use-partners-column-visibility";
import { usePartnersTableLayout } from "@/components/admin/use-partners-table-layout";

export function AdminPartnersListClient({
  tabs,
  affiliationOptions,
  selectedCompanies,
  onCompanyChange,
  partners,
  sort,
  pagination,
}: {
  tabs: PortalDataTableTabConfig[];
  affiliationOptions: string[];
  selectedCompanies: string[];
  /** When set, company filter is client-side (no router.push). */
  onCompanyChange?: (company: string) => void;
  partners: AdminPartnerRow[];
  sort: PortalDataTableSortState;
  pagination?: React.ReactNode;
}) {
  const { layout, setLayout } = usePartnersTableLayout();
  const { visibility, setColumnVisible } = usePartnersColumnVisibility();

  const viewControls = (
    <>
      <PartnersTableLayoutToggle layout={layout} onLayoutChange={setLayout} />
      <PartnersColumnVisibilityMenu
        visibility={visibility}
        onToggle={setColumnVisible}
      />
    </>
  );

  return (
    <>
      <AdminPartnersFilterBar
        tabs={tabs}
        affiliationOptions={affiliationOptions}
        selectedCompanies={selectedCompanies}
        onCompanyChange={onCompanyChange}
        trailing={viewControls}
      />

      {partners.length === 0 ? (
        <PortalDataTableCard>
          <div className="card">
            <EmptyState
              icon={Users}
              title="No partners yet"
              description="Partners will appear here once they sign up and complete onboarding."
              accent="rose"
            />
          </div>
        </PortalDataTableCard>
      ) : (
        <PortalDataTableCard footer={layout === "cards" ? pagination : undefined}>
          <AdminPartnersTable
            partners={partners}
            sort={sort}
            layout={layout}
            visibility={visibility}
            tableFooter={layout === "table" ? pagination : undefined}
          />
        </PortalDataTableCard>
      )}
    </>
  );
}
