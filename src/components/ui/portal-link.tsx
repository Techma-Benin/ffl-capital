"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { usePortal } from "@/components/layout/portal-provider";

type PortalLinkProps = ComponentProps<typeof Link>;

export function PortalLink({ href, onClick, ...props }: PortalLinkProps) {
  const { startNavigation } = usePortal();

  const path = typeof href === "string" ? href : (href.pathname ?? "");

  return (
    <Link
      href={href}
      onClick={(e) => {
        if (path) startNavigation(path);
        onClick?.(e);
      }}
      {...props}
    />
  );
}
