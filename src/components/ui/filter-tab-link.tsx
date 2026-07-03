"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { usePortal } from "@/components/layout/portal-provider";
import { Spinner } from "@/components/ui/spinner";

export function FilterTabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  const { pendingPath, startNavigation } = usePortal();
  const pending = pendingPath === href;

  return (
    <Link
      href={href}
      onClick={() => startNavigation(href)}
      aria-busy={pending}
      className={clsx(
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:text-slate-700",
        pending && "pointer-events-none opacity-70",
      )}
    >
      {pending && <Spinner size="xs" />}
      {children}
    </Link>
  );
}
