"use client";

import { clsx } from "clsx";
import { usePortal } from "@/components/layout/portal-provider";
import { SidebarNavLink } from "@/components/ui/sidebar-nav-link";
import {
  SidebarCollapseButton,
  useSidebarEmptyAreaClick,
} from "@/components/ui/sidebar-toggle";
import dynamic from "next/dynamic";
const SidebarUserButton = dynamic(
  () => import("@/components/ui/sidebar-user-button").then((m) => m.SidebarUserButton),
  { ssr: false }
);
import {
  SquaresFour,
  Users,
  FileText,
  ArrowCounterClockwise,
  Archive,
  Gear,
  Shield,
  UploadSimple,
  Funnel,
} from "@phosphor-icons/react";

/** Flat nav aligned to Pencil mockup; keep Filter List / Integrity / Migration. */
const navItems = [
  { href: "/admin", label: "Dashboard", icon: SquaresFour, exact: true },
  { href: "/admin/partners", label: "Partners", icon: Users },
  { href: "/admin/leads", label: "Leads", icon: FileText },
  { href: "/admin/refunds", label: "Refunds", icon: ArrowCounterClockwise },
  { href: "/admin/aged", label: "Aged Leads", icon: Archive },
  { href: "/admin/filter-list", label: "Filter List", icon: Funnel },
  { href: "/admin/integrity", label: "Integrity", icon: Shield },
  { href: "/admin/migration", label: "Migration", icon: UploadSimple },
  { href: "/admin/settings", label: "Settings", icon: Gear },
];

export function AdminSidebar() {
  const { sidebarCollapsed } = usePortal();
  const handleEmptyAreaClick = useSidebarEmptyAreaClick();

  return (
    <aside
      onClick={handleEmptyAreaClick}
      aria-label="Click empty area to toggle sidebar"
      className={clsx(
        "flex h-screen flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar-bg transition-[width] duration-300 ease-out motion-reduce:transition-none",
        sidebarCollapsed ? "w-[72px]" : "w-60",
      )}
    >
      <div
        className={clsx(
          "flex h-16 items-center border-b border-sidebar-border",
          sidebarCollapsed ? "justify-center px-2" : "gap-2.5 px-4",
        )}
      >
        {/* Logo — always visible; centered when collapsed */}
        <div className="flex flex-shrink-0 items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-100" />
        </div>

        {/* Title + collapse button — only when expanded */}
        <div
          className={clsx(
            "flex min-w-0 flex-1 items-center overflow-hidden transition-all duration-300",
            sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100",
          )}
        >
          <div className="min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold leading-tight text-slate-800">
              FFL Capital
            </span>
            <span className="block text-[11px] font-medium leading-tight text-sidebar-heading">
              Admin Portal
            </span>
          </div>
          <SidebarCollapseButton />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <SidebarNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              exact={item.exact}
            />
          ))}
        </div>
      </nav>

      <div
        className={clsx(
          "border-t border-sidebar-border py-4",
          sidebarCollapsed ? "px-2" : "px-4",
        )}
      >
        <SidebarUserButton afterSignOutUrl="/admin/sign-in" />
      </div>

      <div className="border-t border-sidebar-border px-3 py-3">
        <p
          className={clsx(
            "px-3 text-[11px] text-sidebar-heading transition-all duration-300",
            sidebarCollapsed ? "h-0 overflow-hidden opacity-0" : "opacity-100",
          )}
        >
          FFL Capital Platform v1.0
        </p>
      </div>
    </aside>
  );
}
