"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PortalDataTableTab } from "@/components/ui/portal-data-table-tab";
import type { PortalDataTableTabConfig } from "@/components/ui/portal-data-table";
import { PARTNER_COMPANY_PARAM } from "@/lib/admin/partner-list-filters";

const BASE_PATH = "/admin/partners";
const LEGACY_FAMILY_PARAM = "family";

export function AdminPartnersFilterBar({
  tabs,
  affiliationOptions,
  selectedCompanies,
}: {
  tabs: PortalDataTableTabConfig[];
  affiliationOptions: string[];
  selectedCompanies: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectValue =
    selectedCompanies.length === 1 ? selectedCompanies[0]! : "";

  function navigateCompany(company: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("page");
    next.delete(LEGACY_FAMILY_PARAM);
    const trimmed = company.trim();
    if (!trimmed) next.delete(PARTNER_COMPANY_PARAM);
    else next.set(PARTNER_COMPANY_PARAM, trimmed);
    const qs = next.toString();
    router.push(qs ? `${BASE_PATH}?${qs}` : BASE_PATH);
  }

  return (
    <div className="relative z-10 mb-4 shrink-0">
      <div className="flex flex-wrap items-center gap-2 px-1 py-2">
        {tabs.map((tab) => (
          <PortalDataTableTab
            key={tab.label}
            href={tab.href}
            active={tab.active}
            count={tab.count}
            accent="rose"
          >
            {tab.label}
          </PortalDataTableTab>
        ))}

        <label className="sr-only" htmlFor="admin-partners-company">
          Company
        </label>
        <select
          id="admin-partners-company"
          className="form-select inline-block w-auto max-w-[240px] shrink-0 min-w-[160px] py-1.5 pl-3 pr-8 text-sm font-medium shadow-none"
          value={selectValue}
          onChange={(e) => navigateCompany(e.target.value)}
          disabled={affiliationOptions.length === 0}
        >
          <option value="">All companies</option>
          {affiliationOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
