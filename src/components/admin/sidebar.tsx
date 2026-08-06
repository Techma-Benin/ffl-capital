"use client";

import { clsx } from "clsx";
import { Zap } from "lucide-react";
import { usePortal } from "@/components/layout/portal-provider";
import { SidebarNavLink } from "@/components/ui/sidebar-nav-link";
import {
  SidebarCollapseButton,
  useSidebarEmptyAreaClick,
} from "@/components/ui/sidebar-toggle";
import {
  LayoutDashboard,
  Users,
  FileText,
  RotateCcw,
  Archive,
  Settings,
  Shield,
  Upload,
} from "lucide-react";

const navSections = [
  {
    label: "Operations",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/leads", label: "Leads", icon: FileText },
      { href: "/admin/aged", label: "Aged Leads", icon: Archive },
      { href: "/admin/refunds", label: "Refunds", icon: RotateCcw },
      { href: "/admin/integrity", label: "Integrity", icon: Shield },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/admin/partners", label: "Partners", icon: Users },
      { href: "/admin/migration", label: "Migration", icon: Upload },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const { sidebarCollapsed } = usePortal();
  const handleEmptyAreaClick = useSidebarEmptyAreaClick();

  return (
    <aside
      onClick={handleEmptyAreaClick}
      aria-label="Click empty area to toggle sidebar"
      className={clsx(
        "flex h-screen flex-shrink-0 flex-col bg-sidebar-bg transition-[width] duration-300 ease-out motion-reduce:transition-none",
        sidebarCollapsed ? "w-[72px]" : "w-60",
      )}
    >
      {/* Brand */}
      <div
        className={clsx(
          "flex h-16 items-center border-b border-white/5",
          sidebarCollapsed ? "justify-center px-2" : "gap-2.5 px-5",
        )}
      >
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-700">
          <Zap size={16} className="text-white" />
        </div>
        <div
          className={clsx(
            "min-w-0 flex-col overflow-hidden transition-all duration-300",
            sidebarCollapsed ? "w-0 opacity-0" : "flex w-auto opacity-100",
          )}
        >
          <span className="truncate text-sm font-semibold leading-tight text-white">
            FFL Capital
          </span>
          <span className="text-[10px] font-medium uppercase leading-tight tracking-wider text-sidebar-text">
            Admin Portal
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
        {navSections.map((section) => (
          <div key={section.label}>
            <p
              className={clsx(
                "nav-item-group-label transition-all duration-300",
                sidebarCollapsed ? "h-0 overflow-hidden py-0 opacity-0" : "opacity-100",
              )}
            >
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <SidebarNavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  exact={item.exact}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/5 px-3 py-3">
        <SidebarCollapseButton />
        <p
          className={clsx(
            "mt-2 px-3 text-xs text-sidebar-heading transition-all duration-300",
            sidebarCollapsed ? "h-0 overflow-hidden opacity-0" : "opacity-100",
          )}
        >
          FFL Capital Platform v1.0
        </p>
      </div>
    </aside>
  );
}
