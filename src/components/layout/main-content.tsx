"use client";

import { clsx } from "clsx";
import { usePortal } from "@/components/layout/portal-provider";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export function MainContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isNavigating } = usePortal();

  return (
    <main className={clsx("flex-1 overflow-y-auto p-6", className)}>
      {isNavigating ? <PageSkeleton /> : children}
    </main>
  );
}
