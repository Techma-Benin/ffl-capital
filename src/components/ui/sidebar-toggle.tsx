"use client";

import { useCallback } from "react";
import { clsx } from "clsx";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
      onClick={toggleSidebar}
      aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="nav-item w-full justify-center text-sidebar-heading hover:text-slate-700"
    >
      {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      <span
        className={clsx(
          "truncate transition-all duration-300",
          sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100",
        )}
      >
        Collapse sidebar
      </span>
    </button>
  );
}
