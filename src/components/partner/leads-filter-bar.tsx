"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CaretDown, CaretUp, X } from "@phosphor-icons/react";
import { clsx } from "clsx";

type FilterOption = { value: string; label: string };

type FilterCategory = {
  key: string;
  label: string;
  paramKey: string;
  options: FilterOption[];
};

export function LeadsFilterBar({
  filterSets,
  availableStates,
  currentSelections,
}: {
  filterSets: { id: string; name: string }[];
  availableStates: string[];
  currentSelections: {
    filterSetId: string | null;
    locations: string[];
    channels: string[];
    types: string[];
    statuses: string[];
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    if (!openKey) return;
    function handle(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenKey(null);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [openKey]);

  const categories: FilterCategory[] = [
    {
      key: "filterSet",
      label: "Filter Set",
      paramKey: "filterSetId",
      options: filterSets.map((f) => ({ value: f.id, label: f.name })),
    },
    {
      key: "location",
      label: "Location",
      paramKey: "loc",
      options: availableStates.map((s) => ({ value: s, label: s })),
    },
    {
      key: "channel",
      label: "Channel",
      paramKey: "ch",
      options: [
        { value: "realtime", label: "Real-time" },
        { value: "aged", label: "Aged" },
      ],
    },
    {
      key: "type",
      label: "Type",
      paramKey: "type",
      options: [
        { value: "traditional_iul", label: "Trad. IUL" },
        { value: "high_intent", label: "High Intent" },
      ],
    },
    {
      key: "status",
      label: "Status",
      paramKey: "status",
      options: [
        { value: "active", label: "Active" },
        { value: "refund_pending", label: "Refund Pending" },
        { value: "refunded", label: "Refunded" },
      ],
    },
  ];

  function getSelected(cat: FilterCategory): string[] {
    if (cat.key === "filterSet") {
      return currentSelections.filterSetId ? [currentSelections.filterSetId] : [];
    }
    const map: Record<string, string[]> = {
      location: currentSelections.locations,
      channel: currentSelections.channels,
      type: currentSelections.types,
      status: currentSelections.statuses,
    };
    return map[cat.key] ?? [];
  }

  function hasAnyFilter() {
    return (
      !!currentSelections.filterSetId ||
      currentSelections.locations.length > 0 ||
      currentSelections.channels.length > 0 ||
      currentSelections.types.length > 0 ||
      currentSelections.statuses.length > 0
    );
  }

  function navigate(params: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("page"); // reset pagination
    for (const [k, v] of Object.entries(params)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    router.push(`/partner/leads?${next.toString()}`);
  }

  function toggleOption(cat: FilterCategory, value: string) {
    if (cat.key === "filterSet") {
      const current = currentSelections.filterSetId;
      navigate({ filterSetId: current === value ? null : value });
      return;
    }
    const paramMap: Record<string, string[]> = {
      location: currentSelections.locations,
      channel: currentSelections.channels,
      type: currentSelections.types,
      status: currentSelections.statuses,
    };
    const keyMap: Record<string, string> = {
      location: "loc",
      channel: "ch",
      type: "type",
      status: "status",
    };
    const current = paramMap[cat.key] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    navigate({ [keyMap[cat.key]]: next.join(",") || null });
  }

  function clearAll() {
    navigate({ filterSetId: null, loc: null, ch: null, type: null, status: null });
  }

  const openCat = categories.find((c) => c.key === openKey) ?? null;

  return (
    <div ref={barRef} className="mb-4">
      {/* Row 1 — filter pill buttons */}
      <div className="flex flex-wrap items-center gap-2 px-1 py-2">
        {categories.map((cat) => {
          const selected = getSelected(cat);
          const isOpen = openKey === cat.key;
          const hasSelection = selected.length > 0;

          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setOpenKey(isOpen ? null : cat.key)}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                isOpen
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : hasSelection
                  ? "border-brand-200 bg-brand-50/60 text-brand-600"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              {cat.label}
              {hasSelection && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {selected.length}
                </span>
              )}
              {isOpen ? (
                <CaretUp size={12} />
              ) : (
                <CaretDown size={12} />
              )}
            </button>
          );
        })}

        {hasAnyFilter() && (
          <button
            type="button"
            onClick={clearAll}
            className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            <X size={12} />
            Clear all
          </button>
        )}
      </div>

      {/* Row 2 — options for the open filter */}
      {openCat && (
        <div className="mt-2 rounded-2xl bg-white px-4 py-3 shadow-sm">
          {openCat.options.length === 0 ? (
            <p className="text-xs text-slate-400">No options available</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {openCat.options.map((opt) => {
                const selected = getSelected(openCat);
                const isSelected =
                  openCat.key === "filterSet"
                    ? currentSelections.filterSetId === opt.value
                    : selected.includes(opt.value);

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleOption(openCat, opt.value)}
                    className={clsx(
                      "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                      isSelected
                        ? "border-brand-500 bg-brand-600 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700",
                    )}
                  >
                    {opt.label}
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
