"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { isNavigationPending, usePortal } from "@/components/layout/portal-provider";
import { Spinner } from "@/components/ui/spinner";

const tabAccentStyles = {
  orange: {
    active: "border-orange-300 bg-orange-50 text-orange-700",
    badgeActive: "bg-orange-600 text-white",
  },
  rose: {
    active: "border-rose-300 bg-rose-50 text-rose-800",
    badgeActive: "bg-rose-600 text-white",
  },
} as const;

/** Status / filter pill tab — same pattern as partner leads filter options. */
export function PortalDataTableTab({
  href,
  active,
  count,
  accent = "orange",
  children,
}: {
  href: string;
  active: boolean;
  count?: number;
  accent?: keyof typeof tabAccentStyles;
  children: React.ReactNode;
}) {
  const { pendingPath, startNavigation } = usePortal();
  const pending = isNavigationPending(pendingPath, href);

  return (
    <Link
      href={href}
      onClick={() => startNavigation(href)}
      aria-busy={pending}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
        active
          ? tabAccentStyles[accent].active
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
        pending && "pointer-events-none opacity-70",
      )}
    >
      {pending && <Spinner size="xs" />}
      {children}
      {count != null && (
        <span
          className={clsx(
            "flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold",
            active
              ? tabAccentStyles[accent].badgeActive
              : "bg-slate-200 text-slate-600",
          )}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
