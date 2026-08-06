"use client";

import Link from "next/link";
import { clsx } from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { ArrowRight, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { slideIconLeading, slideIconTrailing } from "@/components/ui/slide-icon-on-hover";

type PrimaryLinkArrowProps = ComponentProps<typeof Link> & {
  children: ReactNode;
};

export function PrimaryLinkArrow({ children, className, ...props }: PrimaryLinkArrowProps) {
  const icon = (
    <ArrowRight size={16} weight={ICON_WEIGHT_LINEAR} className="shrink-0" aria-hidden />
  );

  return (
    <Link
      {...props}
      className={clsx("group btn-primary inline-flex w-full items-center justify-center", className)}
    >
      <span className="inline-flex items-center justify-center gap-2">
        <span className={slideIconLeading} aria-hidden>
          {icon}
        </span>
        <span>{children}</span>
        <span className={slideIconTrailing} aria-hidden>
          {icon}
        </span>
      </span>
    </Link>
  );
}
