"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  FileText,
  Wallet,
  ShoppingBag,
  Settings,
  Phone,
  BarChart2,
  ChevronRight,
  Zap,
} from "lucide-react";

const navItems = [
  { href: "/partner",        label: "Dashboard",        icon: LayoutDashboard, exact: true },
  { href: "/partner/leads",  label: "My Leads",         icon: FileText },
  { href: "/partner/wallet", label: "Wallet",           icon: Wallet },
  { href: "/partner/aged",   label: "Aged Marketplace", icon: ShoppingBag },
  { href: "/partner/reports",label: "Reports",          icon: BarChart2 },
  { href: "/partner/settings",label: "Settings",        icon: Settings },
  { href: "/partner/contact",label: "Contact Us",       icon: Phone },
];

export function PartnerSidebar({
  partnerName,
  affiliation,
  status,
  balance,
}: {
  partnerName: string;
  affiliation: string | null;
  status: string;
  balance: number;
}) {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const isActiveBuyer = status === "active" && balance >= 25;

  return (
    <aside className="flex h-screen w-60 flex-col bg-sidebar-bg">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-white/5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700">
          <Zap size={16} className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white leading-tight">FFL Capital</span>
          <span className="text-[10px] font-medium text-sidebar-text leading-tight uppercase tracking-wider">Partner Portal</span>
        </div>
      </div>

      {/* Partner info */}
      <div className="border-b border-white/5 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-800 text-sm font-bold text-white">
            {partnerName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{partnerName}</p>
            {affiliation && (
              <p className="truncate text-xs text-sidebar-text">{affiliation}</p>
            )}
          </div>
        </div>
        {/* Status + Balance */}
        <div className="mt-3 flex items-center justify-between">
          <span
            className={clsx(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              isActiveBuyer
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-white/10 text-sidebar-text"
            )}
          >
            {isActiveBuyer ? "● Buying Active" : "● Inactive"}
          </span>
          <span className="text-sm font-bold text-white">${balance.toFixed(2)}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        <div className="space-y-0.5">
          {navItems.map((item) => {
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
      </nav>

      <div className="border-t border-white/5 px-4 py-3">
        <p className="text-xs text-sidebar-heading">FFL Capital Platform v1.0</p>
      </div>
    </aside>
  );
}
