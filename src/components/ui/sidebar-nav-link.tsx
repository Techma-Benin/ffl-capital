"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import type { Icon } from "@phosphor-icons/react";
import { usePortal } from "@/components/layout/portal-provider";
import { Spinner } from "@/components/ui/spinner";

export function SidebarNavLink({
  href,
  label,
  icon: Icon,
  exact,
}: {
  href: string;
  label: string;
  icon: Icon;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const { sidebarCollapsed, pendingPath, startNavigation } = usePortal();

  const active = exact ? pathname === href : pathname.startsWith(href);
  const pending = pendingPath === href;

  return (
    <Link
      href={href}
      onClick={() => startNavigation(href)}
      title={sidebarCollapsed ? label : undefined}
      aria-busy={pending}
      className={clsx(
        "nav-item group relative",
        active && "active",
        pending && "pointer-events-none opacity-80",
        sidebarCollapsed && "justify-center !px-0",
      )}
    >
      <span
        className={clsx(
          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors",
          active
            ? "bg-brand-700/10 text-brand-700"
            : "bg-transparent text-sidebar-text group-hover:text-slate-700",
        )}
      >
        {pending ? (
          <Spinner size="xs" variant="brand" />
        ) : (
          <Icon size={16} weight="duotone" />
        )}
      </span>

      <span
        className={clsx(
          "truncate transition-all duration-300",
          sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100",
        )}
      >
        {label}
      </span>

      {!sidebarCollapsed && active && !pending && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-700" />
      )}

      {sidebarCollapsed && (
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          {label}
        </span>
      )}
    </Link>
  );
}
