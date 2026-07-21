"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CaretDown, CaretUp, X, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { clsx } from "clsx";
import { PortalDataTableTab } from "@/components/ui/portal-data-table-tab";
import type { PortalDataTableTabConfig } from "@/components/ui/portal-data-table";
import { PARTNER_COMPANY_PARAM } from "@/lib/admin/partner-list-filters";

const BASE_PATH = "/admin/partners";
const LEGACY_FAMILY_PARAM = "family";

const filterPillActive =
  "border-orange-300 bg-orange-50 text-orange-700";
const filterPillWithSelection =
  "border-orange-200 bg-orange-50/60 text-orange-600";
const filterPillIdle =
  "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50";

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
  const [companyOpen, setCompanyOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!companyOpen) return;
    let removeListener: (() => void) | undefined;
    // Defer so the opening click/mousedown is not treated as an outside dismiss.
    const deferId = window.setTimeout(() => {
      function handle(e: MouseEvent) {
        if (barRef.current && !barRef.current.contains(e.target as Node)) {
          setCompanyOpen(false);
        }
      }
      document.addEventListener("mousedown", handle);
      removeListener = () => document.removeEventListener("mousedown", handle);
    }, 0);
    return () => {
      window.clearTimeout(deferId);
      removeListener?.();
    };
  }, [companyOpen]);

  function navigateCompany(nextCompanies: string[]) {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("page");
    next.delete(LEGACY_FAMILY_PARAM);
    if (nextCompanies.length === 0) next.delete(PARTNER_COMPANY_PARAM);
    else next.set(PARTNER_COMPANY_PARAM, nextCompanies.join(","));
    const qs = next.toString();
    router.push(qs ? `${BASE_PATH}?${qs}` : BASE_PATH);
  }

  function toggleCompany(value: string) {
    const next = selectedCompanies.includes(value)
      ? selectedCompanies.filter((v) => v !== value)
      : [...selectedCompanies, value];
    navigateCompany(next);
  }

  function clearCompany() {
    navigateCompany([]);
    setCompanyOpen(false);
  }

  const hasCompanySelection = selectedCompanies.length > 0;

  return (
    <div ref={barRef} className="relative z-10 mb-4 shrink-0">
      <div className="flex flex-wrap items-center gap-2 px-1 py-2">
        {tabs.map((tab) => (
          <PortalDataTableTab
            key={tab.label}
            href={tab.href}
            active={tab.active}
            count={tab.count}
          >
            {tab.label}
          </PortalDataTableTab>
        ))}

        <button
          type="button"
          aria-expanded={companyOpen}
          onClick={(e) => {
            e.stopPropagation();
            setCompanyOpen((open) => !open);
          }}
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
            companyOpen
              ? filterPillActive
              : hasCompanySelection
                ? filterPillWithSelection
                : filterPillIdle,
          )}
        >
          Company
          {hasCompanySelection && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white">
              {selectedCompanies.length}
            </span>
          )}
          {companyOpen ? (
            <CaretUp size={12} weight={ICON_WEIGHT_LINEAR} />
          ) : (
            <CaretDown size={12} weight={ICON_WEIGHT_LINEAR} />
          )}
        </button>

        {hasCompanySelection && (
          <button
            type="button"
            onClick={clearCompany}
            className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-red-500"
          >
            <X size={12} weight={ICON_WEIGHT_LINEAR} />
            Clear company
          </button>
        )}
      </div>

      {companyOpen && (
        <div className="mt-1 px-1 py-2">
          {affiliationOptions.length === 0 ? (
            <p className="text-xs text-slate-400">No companies recorded yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {affiliationOptions.map((name) => {
                const isSelected = selectedCompanies.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleCompany(name)}
                    className={clsx(
                      "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                      isSelected
                        ? filterPillActive
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700",
                    )}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
