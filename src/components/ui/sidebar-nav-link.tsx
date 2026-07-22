"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import type { Icon } from "@/lib/icons/client";
import { ICON_WEIGHT } from "@/lib/icons/client";
import { isNavigationPending, usePortal } from "@/components/layout/portal-provider";
import { Spinner } from "@/components/ui/spinner";
import {
  sidebarNavAccentStyles,
  type SidebarNavAccent,
} from "@/components/ui/sidebar-nav-accent";

export function SidebarNavLink({
  href,
  label,
  icon: IconComponent,
  exact,
  accent = "brand",
}: {
  href: string;
  label: string;
  icon: Icon;
  exact?: boolean;
  accent?: SidebarNavAccent;
}) {
  const pathname = usePathname();
  const { sidebarCollapsed, pendingPath, startNavigation } = usePortal();

  const active = exact ? pathname === href : pathname.startsWith(href);
  const pending = isNavigationPending(pendingPath, href);
  const styles = sidebarNavAccentStyles[accent];

  return (
    <Link
      href={href}
      onClick={() => startNavigation(href)}
      title={sidebarCollapsed ? label : undefined}
      aria-busy={pending}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "nav-item group relative",
        active && "active",
        active && styles.activeBg,
        active && styles.activeText,
        pending && "pointer-events-none opacity-80",
        sidebarCollapsed && "justify-center px-0",
      )}
    >
      <span
        className={clsx(
          "flex flex-shrink-0 items-center justify-center",
          active
            ? styles.activeIcon
            : "text-sidebar-text group-hover:text-slate-700",
        )}
      >
        {pending ? (
          <Spinner size="xs" variant={styles.spinner} />
        ) : (
          <IconComponent size={22} weight={ICON_WEIGHT} />
        )}
      </span>

      {!sidebarCollapsed && <span className="truncate">{label}</span>}

      {!sidebarCollapsed && active && !pending && (
        <span
          className={clsx("ml-auto h-1.5 w-1.5 rounded-full", styles.dot)}
        />
      )}

      {sidebarCollapsed && (
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          {label}
        </span>
      )}
    </Link>
  );
}
