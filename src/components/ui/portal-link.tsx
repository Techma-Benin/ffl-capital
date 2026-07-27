"use client";

import Link from "next/link";
import { clsx } from "clsx";
import type { ComponentProps } from "react";
import { isNavigationPending, usePortal } from "@/components/layout/portal-provider";

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
      {children}
    </Link>
  );
}
