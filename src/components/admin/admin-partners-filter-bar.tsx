"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CaretDown, CaretUp, X, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { clsx } from "clsx";
import { PortalDataTableTab } from "@/components/ui/portal-data-table-tab";
import type { PortalDataTableTabConfig } from "@/components/ui/portal-data-table";
import { PARTNER_FAMILY_PARAM } from "@/lib/admin/partner-list-filters";

const BASE_PATH = "/admin/partners";

export function AdminPartnersFilterBar({
  tabs,
  affiliationOptions,
  selectedFamilies,
}: {
  tabs: PortalDataTableTabConfig[];
  affiliationOptions: string[];
  selectedFamilies: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [familiesOpen, setFamiliesOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!familiesOpen) return;
    function handle(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setFamiliesOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [familiesOpen]);

  function navigateFamily(nextFamilies: string[]) {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("page");
    if (nextFamilies.length === 0) next.delete(PARTNER_FAMILY_PARAM);
    else next.set(PARTNER_FAMILY_PARAM, nextFamilies.join(","));
    const qs = next.toString();
    router.push(qs ? `${BASE_PATH}?${qs}` : BASE_PATH);
  }

  function toggleFamily(value: string) {
    const next = selectedFamilies.includes(value)
      ? selectedFamilies.filter((v) => v !== value)
      : [...selectedFamilies, value];
    navigateFamily(next);
  }

  function clearFamilies() {
    navigateFamily([]);
    setFamiliesOpen(false);
  }

  const hasFamilySelection = selectedFamilies.length > 0;

  return (
    <div ref={barRef} className="mb-4">
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
          onClick={() => setFamiliesOpen((open) => !open)}
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
            familiesOpen
              ? "border-orange-300 bg-orange-50 text-orange-700"
              : hasFamilySelection
                ? "border-orange-200 bg-orange-50/60 text-orange-600"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
          )}
        >
          Families
          {hasFamilySelection && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white">
              {selectedFamilies.length}
            </span>
          )}
          {familiesOpen ? (
            <CaretUp size={12} weight={ICON_WEIGHT_LINEAR} />
          ) : (
            <CaretDown size={12} weight={ICON_WEIGHT_LINEAR} />
          )}
        </button>

        {hasFamilySelection && (
          <button
            type="button"
            onClick={clearFamilies}
            className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-red-500"
          >
            <X size={12} weight={ICON_WEIGHT_LINEAR} />
            Clear families
          </button>
        )}
      </div>

      {familiesOpen && (
        <div className="mt-1 px-1 py-2">
          {affiliationOptions.length === 0 ? (
            <p className="text-xs text-slate-400">No affiliations recorded yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {affiliationOptions.map((name) => {
                const isSelected = selectedFamilies.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleFamily(name)}
                    className={clsx(
                      "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                      isSelected
                        ? "border-orange-500 bg-orange-600 text-white"
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
