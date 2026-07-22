"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { PortalDataTableTab } from "@/components/ui/portal-data-table-tab";
import type { PortalDataTableTabConfig } from "@/components/ui/portal-data-table";
import { CaretDown, Check, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { PARTNER_COMPANY_PARAM } from "@/lib/admin/partner-list-filters";
import { useNavigateWithPending } from "@/hooks/use-navigate-with-pending";

const BASE_PATH = "/admin/partners";
const LEGACY_FAMILY_PARAM = "family";

const companyTriggerIdle =
  "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50";
const companyTriggerActive = "border-rose-300 bg-rose-50 text-rose-800";

function CompanyFilterDropdown({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string;
  options: string[];
  disabled: boolean;
  onChange: (company: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number } | null>(
    null,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setMenuStyle(null);
      return;
    }
    function place() {
      const btn = buttonRef.current;
      const menu = menuRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const menuWidth = menu?.offsetWidth ?? 224;
      const menuHeight = menu?.offsetHeight ?? 200;
      const gap = 6;
      const left = Math.min(
        Math.max(8, rect.left),
        window.innerWidth - menuWidth - 8,
      );
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuHeight + gap && rect.top > menuHeight + gap;
      const top = openUp ? rect.top - gap - menuHeight : rect.bottom + gap;
      setMenuStyle({ top, left });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  function pick(company: string) {
    onChange(company);
    setOpen(false);
  }

  const items: { value: string; label: string }[] = [
    { value: "", label: "All companies" },
    ...options.map((name) => ({ value: name, label: name })),
  ];

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        id="admin-partners-company"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filter by company"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "inline-flex max-w-[240px] min-w-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
          value ? companyTriggerActive : companyTriggerIdle,
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span className="min-w-0 truncate">{value || "Company"}</span>
        <CaretDown
          size={16}
          weight={ICON_WEIGHT_LINEAR}
          aria-hidden
          className={clsx(
            "shrink-0 opacity-70 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-labelledby="admin-partners-company"
            className="fixed z-[100] max-h-72 w-56 overflow-y-auto rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-xl shadow-slate-900/10"
            style={
              menuStyle
                ? { top: menuStyle.top, left: menuStyle.left }
                : { visibility: "hidden", top: 0, left: 0 }
            }
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item) => {
              const selected = value === item.value;
              return (
                <button
                  key={item.value || "__all__"}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={clsx(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    selected
                      ? "bg-rose-50 font-medium text-rose-800"
                      : "text-slate-700 hover:bg-slate-50",
                  )}
                  onClick={() => pick(item.value)}
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {selected ? (
                    <Check
                      size={16}
                      weight={ICON_WEIGHT_LINEAR}
                      className="shrink-0 text-rose-600"
                      aria-hidden
                    />
                  ) : (
                    <span className="size-4 shrink-0" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}

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
  const { push } = useNavigateWithPending();
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
    push(qs ? `${BASE_PATH}?${qs}` : BASE_PATH);
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

        <CompanyFilterDropdown
          value={selectValue}
          options={affiliationOptions}
          disabled={companyDisabled}
          onChange={navigateCompany}
        />

        {trailing ? (
          <div className="ml-auto flex items-center gap-2">{trailing}</div>
        ) : null}
      </div>
    </div>
  );
}
