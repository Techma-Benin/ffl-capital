"use client";

import { PartnersTableLayoutToggle } from "@/components/admin/partners-table-layout-toggle";
import { AdminLeadsColumnVisibilityMenu } from "@/components/admin/admin-leads-column-visibility-menu";
import { useAdminLeadsTableLayout } from "@/components/admin/use-admin-leads-table-layout";
import { useLeadColumnSettingsBridge } from "@/components/leads/lead-column-settings-bridge";
import type {
  AdminLeadHideableColumnKey,
  AdminLeadsColumnVisibilityState,
} from "@/lib/admin/admin-leads-table-display";

export function AdminLeadsToolbarDisplayControls({
  visibility,
  onToggle,
}: {
  visibility: AdminLeadsColumnVisibilityState;
  onToggle: (key: AdminLeadHideableColumnKey, visible: boolean) => void;
}) {
  const { layout, setLayout } = useAdminLeadsTableLayout();
  const columnSettingsBridge = useLeadColumnSettingsBridge();

  return (
    <>
      <PartnersTableLayoutToggle
        layout={layout}
        onLayoutChange={setLayout}
        onOpenColumnSettings={columnSettingsBridge?.openColumnSettings}
      />
      <AdminLeadsColumnVisibilityMenu
        visibility={visibility}
        onToggle={onToggle}
      />
    </>
  );
}

export function PartnerLeadsToolbarDisplayControls() {
  const columnSettingsBridge = useLeadColumnSettingsBridge();

  return (
    <PartnersTableLayoutToggle
      onOpenColumnSettings={columnSettingsBridge?.openColumnSettings}
    />
  );
}
