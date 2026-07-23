"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { CaretDown, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";

const triggerIdle =
  "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50";

export type FilterSelectAccent = "orange" | "teal";

const ACCENT_STYLES: Record<
  FilterSelectAccent,
  {
    triggerActive: string;
    optionChecked: string;
    checkbox: string;
    countChecked: string;
  }
> = {
  orange: {
    triggerActive: "border-orange-200 bg-orange-50 text-orange-900",
    optionChecked: "bg-orange-50 text-orange-900",
    checkbox: "text-orange-600 focus:ring-orange-500",
    countChecked: "bg-orange-100 text-orange-700",
  },
  teal: {
    triggerActive: "border-teal-200 bg-teal-50 text-teal-800",
    optionChecked: "bg-teal-50 text-teal-800",
    checkbox: "text-teal-600 focus:ring-teal-500",
    countChecked: "bg-teal-100 text-teal-700",
  },
};

type FilterOption<T extends string> = { value: T; label: string };

type SharedProps<T extends string> = {
  id: string;
  dimensionLabel: string;
  options: FilterOption<T>[];
  counts?: Partial<Record<T, number>>;
  disabled?: boolean;
  menuWidthClass?: string;
  searchable?: boolean;
  /** Active trigger and selected row styling; admin defaults to orange */
  accent?: FilterSelectAccent;
};

type SingleSelectProps<T extends string> = SharedProps<T> & {
  selectionMode?: "single";
  value: T;
  allValue: T;
  onChange: (next: T) => void;
};

type MultiSelectProps<T extends string> = SharedProps<T> & {
  selectionMode: "multi";
  value: string[];
  allValue: T;
  onChange: (next: string[]) => void;
};

export function FilterSelectDropdown<T extends string>(
  props: SingleSelectProps<T> | MultiSelectProps<T>,
) {
  const {
    id,
    dimensionLabel,
    options,
    counts,
    disabled,
    menuWidthClass = "w-56",
    searchable = props.selectionMode === "multi",
    accent = "orange",
  } = props;

  const accentStyles = ACCENT_STYLES[accent];

  const selectionMode = props.selectionMode ?? "single";
  const allValue = props.allValue;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number } | null>(
    null,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const hasSelection =
    selectionMode === "multi"
      ? props.value.length > 0
      : props.value !== allValue;

  const singleValue = selectionMode === "single" ? props.value : undefined;
  const multiValue = selectionMode === "multi" ? props.value : undefined;

  const triggerText = useMemo(() => {
    if (!hasSelection) return dimensionLabel;
    if (selectionMode === "multi" && multiValue) {
      if (multiValue.length === 1) {
        const opt = options.find((o) => o.value === multiValue[0]);
        return `${dimensionLabel}: ${opt?.label ?? multiValue[0]}`;
      }
      return `${dimensionLabel}: ${multiValue.length} selected`;
    }
    if (singleValue !== undefined) {
      const selectedOption = options.find((o) => o.value === singleValue);
      return selectedOption
        ? `${dimensionLabel}: ${selectedOption.label}`
        : dimensionLabel;
    }
    return dimensionLabel;
  }, [
    dimensionLabel,
    hasSelection,
    multiValue,
    options,
    selectionMode,
    singleValue,
  ]);

  const normalizedSearch = search.trim().toLowerCase();
  const visibleOptions = useMemo(() => {
    if (!searchable || !normalizedSearch) return options;
    return options.filter((o) => o.label.toLowerCase().includes(normalizedSearch));
  }, [normalizedSearch, options, searchable]);

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
  }, [open, options.length, searchable, visibleOptions.length, search]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }
    if (searchable) {
      const t = window.setTimeout(() => searchRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [open, searchable]);

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

  function isOptionChecked(optionValue: T): boolean {
    if (selectionMode === "multi") {
      if (optionValue === allValue) return props.value.length === 0;
      return props.value.includes(optionValue);
    }
    return props.value === optionValue;
  }

  function toggleOption(optionValue: T) {
    if (selectionMode === "multi") {
      if (optionValue === allValue) {
        props.onChange([]);
        return;
      }
      const current = props.value;
      if (current.includes(optionValue)) {
        props.onChange(current.filter((v) => v !== optionValue));
      } else {
        props.onChange([...current, optionValue]);
      }
      return;
    }
    props.onChange(optionValue);
    if (optionValue !== allValue) {
      setOpen(false);
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Filter by ${dimensionLabel.toLowerCase()}`}
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "inline-flex max-w-[240px] min-w-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
          hasSelection ? accentStyles.triggerActive : triggerIdle,
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span className="min-w-0 truncate">{triggerText}</span>
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
            role="dialog"
            aria-labelledby={id}
            className={clsx(
              "fixed z-[100] flex max-h-80 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/10",
              menuWidthClass,
            )}
            style={
              menuStyle
                ? { top: menuStyle.top, left: menuStyle.left }
                : { visibility: "hidden", top: 0, left: 0 }
            }
            onClick={(e) => e.stopPropagation()}
          >
            {searchable && (
              <div className="border-b border-slate-100 p-2">
                <input
                  ref={searchRef}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  aria-label={`Search ${dimensionLabel.toLowerCase()} options`}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300/60"
                />
              </div>
            )}
            <div className="max-h-64 overflow-y-auto p-1.5">
              {visibleOptions.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-500">No matches</p>
              ) : (
                visibleOptions.map((option) => {
                  const checked = isOptionChecked(option.value);
                  const count = counts?.[option.value];
                  const inputId = `${id}-opt-${option.value}`;
                  return (
                    <label
                      key={option.value}
                      htmlFor={inputId}
                      className={clsx(
                        "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                        checked
                          ? accentStyles.optionChecked
                          : "text-slate-700 hover:bg-slate-50",
                      )}
                    >
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOption(option.value)}
                        className={clsx(
                          "size-4 shrink-0 rounded border-slate-300",
                          accentStyles.checkbox,
                        )}
                        aria-label={option.label}
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {option.label}
                      </span>
                      {counts && count !== undefined && (
                        <span
                          className={clsx(
                            "min-w-[1.25rem] shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                            checked
                              ? accentStyles.countChecked
                              : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
