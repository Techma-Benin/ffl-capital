"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { isNavigationPending, usePortal } from "@/components/layout/portal-provider";

const activeAccentClasses = {
  brand: "bg-brand-50 text-brand-700",
  violet: "bg-violet-50 text-violet-700",
  orange: "bg-orange-50 text-orange-700",
} as const;

export function FilterTabLink({
  href,
  active,
  accent = "brand",
  children,
}: {
  href: string;
  active: boolean;
  accent?: keyof typeof activeAccentClasses;
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
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        active ? activeAccentClasses[accent] : "text-slate-500 hover:text-slate-700",
        pending && "pointer-events-none opacity-70",
      )}
    >
      {children}
    </Link>
  );
}
