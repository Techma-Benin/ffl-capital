"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { isNavigationPending, usePortal } from "@/components/layout/portal-provider";
import { Spinner } from "@/components/ui/spinner";

export function PortalPaginationLink({
  href,
  disabled,
  label,
}: {
  href: string;
  disabled: boolean;
  label: string;
}) {
  const { pendingPath, startNavigation } = usePortal();
  const pending = isNavigationPending(pendingPath, href);

  if (disabled) {
    return (
      <span className="rounded-md px-2.5 py-1 text-xs text-slate-300">{label}</span>
    );
  }

  return (
    <Link
      href={href}
      onClick={() => startNavigation(href)}
      aria-busy={pending}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700",
        "hover:bg-slate-50",
        pending && "pointer-events-none opacity-70",
      )}
    >
      {pending && <Spinner size="xs" />}
      {label}
    </Link>
  );
}
