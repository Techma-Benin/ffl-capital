"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { SquaresFour, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import {
  PARTNER_COLUMN_TOGGLE_LABELS,
  PARTNER_HIDEABLE_COLUMN_KEYS,
  type PartnerHideableColumnKey,
  type PartnersColumnVisibilityState,
} from "@/lib/admin/partners-table-columns";

export function PartnersColumnVisibilityMenu({
  visibility,
  onToggle,
}: {
  visibility: PartnersColumnVisibilityState;
  onToggle: (key: PartnerHideableColumnKey, visible: boolean) => void;
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
      const menuWidth = menu?.offsetWidth ?? 220;
      const menuHeight = menu?.offsetHeight ?? 280;
      const gap = 4;
      const left = Math.max(8, rect.right - menuWidth);
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
  }, [open]);

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

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={clsx(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-orange-600",
          open && "bg-slate-100 text-orange-600",
        )}
        aria-label="Choose columns to display"
        aria-expanded={open}
      >
        <SquaresFour size={18} weight={ICON_WEIGHT_LINEAR} />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 w-56 rounded-xl border border-slate-100 bg-white py-2 shadow-lg"
            style={
              menuStyle
                ? { top: menuStyle.top, left: menuStyle.left }
                : { visibility: "hidden", top: 0, left: 0 }
            }
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Columns
            </p>
            <ul className="max-h-64 overflow-y-auto px-1.5">
              {PARTNER_HIDEABLE_COLUMN_KEYS.map((key) => (
                <li key={key}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={visibility[key]}
                      onChange={(e) => onToggle(key, e.target.checked)}
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                    />
                    {PARTNER_COLUMN_TOGGLE_LABELS[key]}
                  </label>
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
