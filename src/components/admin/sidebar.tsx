"use client";

import { clsx } from "clsx";
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
  ListFilter,
} from "lucide-react";
import Link from "next/link";

/** Flat nav aligned to Pencil mockup; keep Filter List / Integrity / Migration. */
const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/partners", label: "Partners", icon: Users },
  { href: "/admin/leads", label: "Leads", icon: FileText },
  { href: "/admin/refunds", label: "Refunds", icon: RotateCcw },
  { href: "/admin/aged", label: "Aged Leads", icon: Archive },
  { href: "/admin/filter-list", label: "Filter List", icon: ListFilter },
  { href: "/admin/integrity", label: "Integrity", icon: Shield },
  { href: "/admin/migration", label: "Migration", icon: Upload },
  { href: "/admin/settings", label: "Settings", icon: Settings },
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
          sidebarCollapsed ? "justify-center px-2" : "gap-2.5 px-5",
        )}
      >
        <div className="flex flex-shrink-0 items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-100" />
        </div>
        <div
          className={clsx(
            "min-w-0 flex-col overflow-hidden transition-all duration-300",
            sidebarCollapsed ? "w-0 opacity-0" : "flex w-auto opacity-100",
          )}
        >
          <span className="truncate text-sm font-semibold leading-tight text-slate-800">
            FFL Capital
          </span>
          <span className="text-[11px] font-medium leading-tight text-sidebar-heading">
            Admin Portal
          </span>
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

      {!sidebarCollapsed && (
        <div className="mx-3 mb-3 rounded-xl bg-brand-50 p-3.5">
          <p className="text-xs font-semibold text-slate-800">Lead Intake Active</p>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            ~500 leads/day via LeadConduit
          </p>
          <Link
            href="/admin/leads"
            className="mt-2.5 inline-flex rounded-md bg-brand-700 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-brand-800"
          >
            View Queue
          </Link>
        </div>
      )}

      <div className="border-t border-sidebar-border px-3 py-3">
        <SidebarCollapseButton />
        <p
          className={clsx(
            "mt-2 px-3 text-[11px] text-sidebar-heading transition-all duration-300",
            sidebarCollapsed ? "h-0 overflow-hidden opacity-0" : "opacity-100",
          )}
        >
          FFL Capital Platform v1.0
        </p>
      </div>
    </aside>
  );
}
