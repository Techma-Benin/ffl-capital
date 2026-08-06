"use client";

import Link from "next/link";
import { clsx } from "clsx";
import type { ComponentProps } from "react";
import { isNavigationPending, usePortal } from "@/components/layout/portal-provider";
import { Spinner } from "@/components/ui/spinner";

type PortalLinkProps = ComponentProps<typeof Link>;

function resolveHref(href: PortalLinkProps["href"]): string {
  if (typeof href === "string") return href;
  const pathname = href.pathname ?? "";
  const search = "search" in href && href.search ? href.search : "";
  return `${pathname}${search}`;
}

export function PortalLink({ href, onClick, className, children, ...props }: PortalLinkProps) {
  const { pendingPath, startNavigation } = usePortal();
  const path = resolveHref(href);
  const pending = path ? isNavigationPending(pendingPath, path) : false;

  return (
    <Link
      href={href}
      onClick={(e) => {
        if (path) startNavigation(path);
        onClick?.(e);
      }}
      aria-busy={pending}
      className={clsx(
        className,
        pending && "pointer-events-none relative opacity-70",
      )}
      {...props}
    >
      {pending && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          <Spinner size="xs" />
        </span>
      )}
      {children}
    </Link>
  );
}
