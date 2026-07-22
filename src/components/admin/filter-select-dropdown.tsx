"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { CaretDown, Check, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";

const triggerIdle =
  "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50";
const triggerActive = "border-rose-300 bg-rose-50 text-rose-800";

export function FilterSelectDropdown<T extends string>({
  id,
  dimensionLabel,
  value,
  allValue,
  options,
  counts,
  onChange,
  disabled,
  menuWidthClass = "w-56",
}: {
  id: string;
  dimensionLabel: string;
  value: T;
  allValue: T;
  options: { value: T; label: string }[];
  counts?: Partial<Record<T, number>>;
  onChange: (next: T) => void;
  disabled?: boolean;
  menuWidthClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number } | null>(
    null,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const hasSelection = value !== allValue;
  const selectedOption = options.find((o) => o.value === value);
  const triggerText =
    hasSelection && selectedOption
      ? `${dimensionLabel}: ${selectedOption.label}`
      : dimensionLabel;

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

  function pick(next: T) {
    onChange(next);
    setOpen(false);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Filter by ${dimensionLabel.toLowerCase()}`}
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "inline-flex max-w-[240px] min-w-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
          hasSelection ? triggerActive : triggerIdle,
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
            role="listbox"
            aria-labelledby={id}
            className={clsx(
              "fixed z-[100] max-h-72 overflow-y-auto rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-xl shadow-slate-900/10",
              menuWidthClass,
            )}
            style={
              menuStyle
                ? { top: menuStyle.top, left: menuStyle.left }
                : { visibility: "hidden", top: 0, left: 0 }
            }
            onClick={(e) => e.stopPropagation()}
          >
            {options.map((option) => {
              const selected = value === option.value;
              const count = counts?.[option.value];
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={clsx(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    selected
                      ? "bg-rose-50 font-medium text-rose-800"
                      : "text-slate-700 hover:bg-slate-50",
                  )}
                  onClick={() => pick(option.value)}
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {counts && count !== undefined && (
                    <span
                      className={clsx(
                        "min-w-[1.25rem] shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                        selected
                          ? "bg-rose-100 text-rose-700"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {count}
                    </span>
                  )}
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

