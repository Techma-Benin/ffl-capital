"use client";

import Link from "next/link";
import { clsx } from "clsx";
import {
  ArrowUp,
  ArrowDown,
  ArrowsDownUp,
  ICON_WEIGHT_LINEAR,
} from "@/lib/icons/client";
import { isNavigationPending, usePortal } from "@/components/layout/portal-provider";
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
  "whitespace-nowrap px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500";

function headerAlignClass(headerClassName?: string) {
  if (headerClassName?.includes("text-right")) return "text-right";
  if (headerClassName?.includes("text-center")) return "text-center";
  return "text-left";
}

export function PortalTableHeaderCell({
  label,
  headerClassName,
  children,
}: {
  label: string;
  headerClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <th className={clsx(headerBase, headerAlignClass(headerClassName), headerClassName)}>
      {children ?? label}
    </th>
  );
}

export function PortalSortableHeaderCell({
  label,
  href,
  onClick,
  active,
  dir,
  headerClassName,
}: {
  label: string;
  /** Link navigation (server-paginated lists). Ignored when `onClick` is set. */
  href?: string;
  /** Client-side sort (load-once lists). Prefer over `href` when both set. */
  onClick?: () => void;
  active: boolean;
  dir: SortDirection;
  headerClassName?: string;
}) {
  const { pendingPath, startNavigation } = usePortal();
  const pending = href ? isNavigationPending(pendingPath, href) : false;

  const className = clsx(
    "inline-flex cursor-pointer items-center gap-1 text-slate-500 hover:text-slate-700",
    active && "text-orange-600 hover:text-orange-700",
    pending && "pointer-events-none opacity-70",
    (headerClassName?.includes("text-center") ||
      headerClassName?.includes("text-right")) &&
      "w-full",
    headerClassName?.includes("text-center") && "justify-center",
    headerClassName?.includes("text-right") && "justify-end",
  );

  return (
    <th
      className={clsx(
        headerBase,
        "select-none",
        headerAlignClass(headerClassName),
        headerClassName,
      )}
    >
      {onClick ? (
        <button type="button" onClick={onClick} className={className}>
          {label}
          <SortIcon active={active} dir={dir} />
        </button>
      ) : href ? (
        <Link
          href={href}
          onClick={() => startNavigation(href)}
          aria-busy={pending}
          className={className}
        >
          {pending && <Spinner size="xs" />}
          {label}
          <SortIcon active={active} dir={dir} />
        </Link>
      ) : (
        <span className={className}>
          {label}
          <SortIcon active={active} dir={dir} />
        </span>
      )}
    </th>
  );
}
