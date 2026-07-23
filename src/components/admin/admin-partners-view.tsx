"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Users, Lightning, Clock } from "@/lib/icons/client";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { ClientTablePagination } from "@/components/ui/table-pagination";
import { AdminPartnersListClient } from "@/components/admin/admin-partners-list-client";
import {
  ClientStoreKeys,
  useClientResource,
} from "@/lib/client-store";
import {
  computeAdminPartnersView,
  type AdminPartnersListFilters,
  type AdminPartnersRawData,
} from "@/lib/admin/partners-raw";
import { PARTNER_COMPANY_PARAM } from "@/lib/admin/partner-list-filters";
import {
  PARTNER_SORT_KEYS,
  type PartnerSortKey,
  type SortDirection,
} from "@/lib/admin/partner-list-sort";

type ListState = AdminPartnersListFilters;

function syncPartnersUrl(pathname: string, state: ListState) {
  const params = new URLSearchParams();
  if (state.status) params.set("status", state.status);
  if (state.companies.length > 0) {
    params.set(PARTNER_COMPANY_PARAM, state.companies.join(","));
  }
  if (state.sort) {
    params.set("sort", state.sort);
    params.set("dir", state.dir);
  }
  if (state.page > 1) params.set("page", String(state.page));
  if (state.pageSize !== 25) params.set("pageSize", String(state.pageSize));
  const qs = params.toString();
  const href = qs ? `${pathname}?${qs}` : pathname;
  window.history.replaceState(window.history.state, "", href);
}

export function AdminPartnersView({
  raw: initialRaw,
  initialFilters,
}: {
  raw: AdminPartnersRawData;
  initialFilters: AdminPartnersListFilters;
}) {
  const pathname = usePathname();
  const { data: raw } = useClientResource<AdminPartnersRawData>(
    ClientStoreKeys.adminPartners,
    { initialData: initialRaw },
  );

  const [filters, setFilters] = useState<ListState>(initialFilters);

  const updateFilters = useCallback(
    (partial: Partial<ListState> | ((prev: ListState) => ListState)) => {
      setFilters((prev) => {
        const next =
          typeof partial === "function"
            ? partial(prev)
            : { ...prev, ...partial };
        syncPartnersUrl(pathname, next);
        return next;
      });
    },
    [pathname],
  );

  const source = raw ?? initialRaw;
  const view = useMemo(
    () => computeAdminPartnersView(source, filters),
    [source, filters],
  );

  const onStatusTab = useCallback(
    (status?: string) => {
      updateFilters({ status, page: 1 });
    },
    [updateFilters],
  );

  const onCompany = useCallback(
    (company: string) => {
      const trimmed = company.trim();
      updateFilters({
        companies: trimmed ? [trimmed] : [],
        page: 1,
      });
    },
    [updateFilters],
  );

  const onSortKey = useCallback(
    (sortKey: string) => {
      if (!PARTNER_SORT_KEYS.includes(sortKey as PartnerSortKey)) return;
      updateFilters((prev) => {
        const key = sortKey as PartnerSortKey;
        const dir: SortDirection =
          prev.sort === key
            ? prev.dir === "asc"
              ? "desc"
              : "asc"
            : "asc";
        return { ...prev, sort: key, dir, page: 1 };
      });
    },
    [updateFilters],
  );

  const tabs = [
    {
      label: "All Partners",
      active: !filters.status,
      count: view.tabCounts.all,
      onClick: () => onStatusTab(undefined),
    },
    {
      label: "Pending",
      active: filters.status === "pending_approval",
      count: view.tabCounts.pending_approval,
      onClick: () => onStatusTab("pending_approval"),
    },
    {
      label: "Active",
      active: filters.status === "active",
      count: view.tabCounts.active,
      onClick: () => onStatusTab("active"),
    },
    {
      label: "Blocked",
      active: filters.status === "disabled",
      count: view.tabCounts.disabled,
      onClick: () => onStatusTab("disabled"),
    },
  ];

  const pagination = (
    <ClientTablePagination
      page={view.page}
      pageSize={view.pageSize}
      total={view.totalFiltered}
      onPageChange={(page) => updateFilters({ page })}
    />
  );

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Partners"
        subtitle="Manage lead buyers and their accounts"
      />

      {source.loadCapped ? (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Showing the first {source.partners.length.toLocaleString()} of{" "}
          {source.totalInDb.toLocaleString()} partners (client filter cap).
        </p>
      ) : null}

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Partners"
          value={view.tabCounts.all}
          icon={Users}
          accent="blue"
          blobIndex={0}
        />
        <StatCard
          label="Lead Buying"
          value={view.leadBuyingCount}
          icon={Lightning}
          accent="emerald"
          blobIndex={1}
        />
        <StatCard
          label="Pending"
          value={view.pendingCount}
          icon={Clock}
          accent="orange"
          blobIndex={2}
        />
      </div>

      <AdminPartnersListClient
        tabs={tabs}
        affiliationOptions={source.affiliationOptions}
        selectedCompanies={filters.companies}
        onCompanyChange={onCompany}
        sort={{
          active: filters.sort,
          dir: filters.dir,
          onSortKey,
        }}
        pagination={pagination}
        partners={view.rows}
      />
    </div>
  );
}
