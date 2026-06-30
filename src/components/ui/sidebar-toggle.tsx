"use client";

import { useCallback } from "react";
import { clsx } from "clsx";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePortal } from "@/components/layout/portal-provider";

/** Collapse the sidebar when clicking empty nav space (not links or buttons). */
export function useSidebarEmptyAreaClick() {
  const { sidebarCollapsed, toggleSidebar } = usePortal();

  return useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (sidebarCollapsed) return;
      if ((e.target as HTMLElement).closest("a, button")) return;
      toggleSidebar();
    },
    [sidebarCollapsed, toggleSidebar],
  );
}

export function SidebarCollapseButton() {
  const { sidebarCollapsed, toggleSidebar } = usePortal();

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="nav-item w-full justify-center text-sidebar-heading hover:text-white"
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
