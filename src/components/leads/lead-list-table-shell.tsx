"use client";

import { PortalDataTableCard } from "@/components/ui/portal-data-table";
import type { PortalDataTableLayout } from "@/components/ui/portal-data-table";

/** Shared card shell for admin and partner lead list tables (toolbar + layout-aware pagination). */
export function LeadListTableShell({
  toolbar,
  layout,
  pagination,
  isEmpty,
  emptyState,
  children,
}: {
  toolbar: React.ReactNode;
  layout: PortalDataTableLayout;
  pagination?: React.ReactNode;
  isEmpty: boolean;
  emptyState: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <PortalDataTableCard
      tabsSlot={<div className="px-1">{toolbar}</div>}
      footer={layout === "cards" ? pagination : undefined}
    >
      {isEmpty ? emptyState : children}
    </PortalDataTableCard>
  );
}
