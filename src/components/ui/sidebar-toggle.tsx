"use client";

import { useCallback } from "react";
import { clsx } from "clsx";
import { SidebarSimple, ICON_WEIGHT } from "@/lib/icons/client";
import { usePortal } from "@/components/layout/portal-provider";

/** Toggle the sidebar when clicking empty space (not links or buttons). */
export function useSidebarEmptyAreaClick() {
  const { toggleSidebar } = usePortal();

  return useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).closest("a, button")) return;
      toggleSidebar();
    },
    [toggleSidebar],
  );
}

export function SidebarCollapseButton() {
  const { sidebarCollapsed, toggleSidebar } = usePortal();

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); toggleSidebar(); }}
      title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      className={clsx(
        "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-sidebar-heading transition-colors hover:bg-black/5 hover:text-slate-700",
      )}
    >
      <SidebarSimple size={16} weight={ICON_WEIGHT} mirrored={sidebarCollapsed} />
    </button>
  );
}
