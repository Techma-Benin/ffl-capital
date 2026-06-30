"use client";

import { clsx } from "clsx";
import { Zap } from "lucide-react";
import { usePortal } from "@/components/layout/portal-provider";
import { usePartner } from "@/components/partner/partner-provider";
import { isPartnerActive } from "@/lib/partner/active";
import { SidebarNavLink } from "@/components/ui/sidebar-nav-link";
import {
  SidebarCollapseButton,
  useSidebarEmptyAreaClick,
} from "@/components/ui/sidebar-toggle";
import { SidebarUserButton } from "@/components/ui/sidebar-user-button";
import {
  LayoutDashboard,
  FileText,
  Wallet,
  ShoppingBag,
  Settings,
  Phone,
  BarChart2,
} from "lucide-react";

const navItems = [
  { href: "/partner",         label: "Dashboard",        icon: LayoutDashboard, exact: true },
  { href: "/partner/leads",   label: "My Leads",         icon: FileText },
  { href: "/partner/wallet",  label: "Wallet",           icon: Wallet },
  { href: "/partner/aged",    label: "Aged Marketplace", icon: ShoppingBag },
  { href: "/partner/reports", label: "Reports",          icon: BarChart2 },
  { href: "/partner/settings",label: "Settings",         icon: Settings },
  { href: "/partner/contact", label: "Contact Us",       icon: Phone },
];

export function PartnerSidebar() {
  const { partner } = usePartner();
  const { sidebarCollapsed } = usePortal();
  const handleEmptyAreaClick = useSidebarEmptyAreaClick();
  const partnerName = `${partner.firstName} ${partner.lastName}`;
  const isActiveBuyer = isPartnerActive(partner);

  return (
    <aside
      onClick={handleEmptyAreaClick}
      aria-label={sidebarCollapsed ? undefined : "Click empty area to collapse sidebar"}
      className={clsx(
        "flex h-screen flex-shrink-0 flex-col bg-sidebar-bg transition-[width] duration-300 ease-out motion-reduce:transition-none",
        sidebarCollapsed ? "w-[72px]" : "w-60",
      )}
    >
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
            Partner Portal
          </span>
        </div>
      </div>

      <div
        className={clsx(
          "border-b border-white/5 py-4",
          sidebarCollapsed ? "px-2" : "px-4",
        )}
      >
        <div
          className={clsx(
            "flex items-center",
            sidebarCollapsed ? "justify-center" : "gap-3",
          )}
        >
          <SidebarUserButton />
          <div
            className={clsx(
              "min-w-0 overflow-hidden transition-all duration-300",
              sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100",
            )}
          >
            <p className="truncate text-sm font-medium text-white">{partnerName}</p>
            {partner.affiliation && (
              <p className="truncate text-xs text-sidebar-text">{partner.affiliation}</p>
            )}
          </div>
        </div>

        <div
          className={clsx(
            "mt-3 flex items-center justify-between gap-2 overflow-hidden transition-all duration-300",
            sidebarCollapsed ? "mt-2 h-0 opacity-0" : "h-auto opacity-100",
          )}
        >
          <span
            className={clsx(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              isActiveBuyer
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-white/10 text-sidebar-text",
            )}
          >
            {isActiveBuyer ? "● Buying Active" : "● Inactive"}
          </span>
          <span className="text-sm font-bold text-white">
            ${partner.walletBalance.toFixed(2)}
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
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
