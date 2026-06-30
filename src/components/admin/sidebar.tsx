"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Users,
  FileText,
  RotateCcw,
  Archive,
  BarChart2,
  Settings,
  ChevronRight,
  Zap,
} from "lucide-react";

const navSections = [
  {
    label: "Operations",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/leads", label: "Leads", icon: FileText },
      { href: "/admin/aged", label: "Aged Leads", icon: Archive },
      { href: "/admin/refunds", label: "Refunds", icon: RotateCcw },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/admin/partners", label: "Partners", icon: Users },
      { href: "/admin/filter-list", label: "Filter List", icon: Zap },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/admin/reports", label: "Reports", icon: BarChart2 },
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
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="flex h-screen w-60 flex-col bg-sidebar-bg">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-white/5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700">
          <Zap size={16} className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white leading-tight">FFL Capital</span>
          <span className="text-[10px] font-medium text-sidebar-text leading-tight uppercase tracking-wider">Admin Portal</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="nav-item-group-label">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx("nav-item", active && "active")}
                  >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                    {active && (
                      <ChevronRight size={14} className="ml-auto opacity-60" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer hint */}
      <div className="border-t border-white/5 px-4 py-3">
        <p className="text-xs text-sidebar-heading">FFL Capital Platform v1.0</p>
      </div>
    </aside>
  );
}
