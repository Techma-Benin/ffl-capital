"use client";

import Link from "next/link";
import { clsx } from "clsx";
import {
  ArrowUp,
  ArrowDown,
  ArrowsDownUp,
  ICON_WEIGHT_LINEAR,
} from "@/lib/icons/client";
import { usePortal } from "@/components/layout/portal-provider";
import { Spinner } from "@/components/ui/spinner";

export type SortDirection = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDirection }) {
  if (!active) {
    return (
      <ArrowsDownUp size={12} className="opacity-40" weight={ICON_WEIGHT_LINEAR} />
    );
  }
  return dir === "asc" ? (
    <ArrowUp size={12} className="text-orange-700" weight={ICON_WEIGHT_LINEAR} />
  ) : (
    <ArrowDown size={12} className="text-orange-700" weight={ICON_WEIGHT_LINEAR} />
  );
}

const headerBase =
  "whitespace-nowrap px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500";

export function PortalTableHeaderCell({
  label,
  headerClassName,
}: {
  label: string;
  headerClassName?: string;
}) {
  return (
    <th className={clsx(headerBase, headerClassName)}>
      {label}
    </th>
  );
}

export function PortalSortableHeaderCell({
  label,
  href,
  active,
  dir,
  headerClassName,
}: {
  label: string;
  href: string;
  active: boolean;
  dir: SortDirection;
  headerClassName?: string;
}) {
  const { pendingPath, startNavigation } = usePortal();
  const pending = pendingPath === href;

  return (
    <th className={clsx(headerBase, "select-none", headerClassName)}>
      <Link
        href={href}
        onClick={() => startNavigation(href)}
        aria-busy={pending}
        className={clsx(
          "inline-flex cursor-pointer items-center gap-1 text-slate-500 hover:text-slate-700",
          active && "text-orange-600 hover:text-orange-700",
          pending && "pointer-events-none opacity-70",
          headerClassName?.includes("text-center") && "justify-center",
        )}
      >
        {pending && <Spinner size="xs" />}
        {label}
        <SortIcon active={active} dir={dir} />
      </Link>
    </th>
  );
}
