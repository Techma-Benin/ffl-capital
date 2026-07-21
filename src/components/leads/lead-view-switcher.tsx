"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Plus } from "@/lib/icons/client";
import {
  LeadViewActionsMenuPanel,
  MenuBackdrop,
  type LeadViewActionsHandlers,
} from "@/components/leads/lead-view-actions-menu";

export type LeadViewSummary = {
  id: string;
  name: string;
  isDefault: boolean;
};

export function LeadViewNewViewButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-orange-400 hover:text-orange-700"
    >
      <Plus size={14} />
      New view
    </button>
  );
}

export function LeadViewSwitcher({
  views,
  activeViewId,
  basePath,
  activeViewActions,
}: {
  views: LeadViewSummary[];
  activeViewId: string;
  basePath: string;
  activeViewActions?: LeadViewActionsHandlers;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [activeViewId]);

  const closeContextMenu = () => setContextMenu(null);

  return (
    <div className="relative min-w-0 flex-1">
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin"
        role="tablist"
        aria-label="Lead list views"
      >
        {views.map((view) => {
          const active = view.id === activeViewId;
          const href = `${basePath}?view=${view.id}`;
          return (
            <Link
              key={view.id}
              href={href}
              role="tab"
              aria-selected={active}
              data-active={active ? "true" : undefined}
              tabIndex={active ? 0 : -1}
              onContextMenu={
                active && activeViewActions
                  ? (e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY });
                    }
                  : undefined
              }
              className={clsx(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                active
                  ? "bg-orange-600 text-white shadow-sm"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
              )}
            >
              {view.name}
              {view.isDefault && !active && (
                <span className="ml-1 text-[10px] text-slate-400">
                  (default)
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {contextMenu && activeViewActions && (
        <>
          <MenuBackdrop onClose={closeContextMenu} />
          <LeadViewActionsMenuPanel
            handlers={activeViewActions}
            onClose={closeContextMenu}
            className="fixed z-50 w-44 rounded-xl border border-slate-100 bg-white py-1 shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          />
        </>
      )}
    </div>
  );
}
