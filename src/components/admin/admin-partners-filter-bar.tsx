"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { PortalDataTableTab } from "@/components/ui/portal-data-table-tab";
import type { PortalDataTableTabConfig } from "@/components/ui/portal-data-table";
import { CaretDown } from "@/lib/icons/client";
import { PARTNER_COMPANY_PARAM } from "@/lib/admin/partner-list-filters";

const BASE_PATH = "/admin/partners";
const LEGACY_FAMILY_PARAM = "family";

const companyFilterIdle =
  "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-white";
const companyFilterActive = "border-rose-300 bg-white text-rose-800 hover:bg-white";

export function AdminPartnersFilterBar({
  tabs,
  affiliationOptions,
  selectedCompanies,
  trailing,
}: {
  tabs: PortalDataTableTabConfig[];
  affiliationOptions: string[];
  selectedCompanies: string[];
  trailing?: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectValue =
    selectedCompanies.length === 1 ? selectedCompanies[0]! : "";
  const companyDisabled = affiliationOptions.length === 0;

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

        <div className="relative inline-flex shrink-0">
          <label className="sr-only" htmlFor="admin-partners-company">
            Company
          </label>
          <span
            aria-hidden
            className={clsx(
              "pointer-events-none inline-flex max-w-[240px] min-w-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
              selectValue ? companyFilterActive : companyFilterIdle,
              companyDisabled && "bg-white opacity-50",
            )}
          >
            <span className="min-w-0 truncate">
              {selectValue || "Company"}
            </span>
            <CaretDown className="size-4 shrink-0 opacity-70" aria-hidden />
          </span>
          <select
            id="admin-partners-company"
            className="absolute inset-0 w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            value={selectValue}
            onChange={(e) => navigateCompany(e.target.value)}
            disabled={companyDisabled}
          >
            <option value="">All companies</option>
            {affiliationOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {trailing ? (
          <div className="ml-auto flex items-center gap-2">{trailing}</div>
        ) : null}
      </div>
    </div>
  );
}
