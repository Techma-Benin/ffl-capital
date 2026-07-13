"use client";

import { clsx } from "clsx";
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
  { href: "/partner", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/partner/leads", label: "My Leads", icon: FileText },
  { href: "/partner/wallet", label: "Wallet", icon: Wallet },
  { href: "/partner/aged", label: "Aged Marketplace", icon: ShoppingBag },
  { href: "/partner/reports", label: "Reports", icon: BarChart2 },
  { href: "/partner/settings", label: "Settings", icon: Settings },
  { href: "/partner/contact", label: "Contact Us", icon: Phone },
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
            Partner Portal
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

      <div
        className={clsx(
          "border-t border-sidebar-border py-4",
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
            <p className="truncate text-sm font-medium text-slate-800">{partnerName}</p>
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
              "rounded-md px-2 py-0.5 text-[11px] font-semibold",
              isActiveBuyer
                ? "bg-accent-50 text-accent-700"
                : "bg-slate-100 text-sidebar-text",
            )}
          >
            {isActiveBuyer ? "● Buying Active" : "● Inactive"}
          </span>
          <span className="text-sm font-bold text-slate-800">
            ${partner.walletBalance.toFixed(2)}
          </span>
        </div>
      </div>

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
