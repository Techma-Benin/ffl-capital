"use client";

import { clsx } from "clsx";
import { usePortal } from "@/components/layout/portal-provider";
import { NavProgress } from "@/components/ui/nav-progress";
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
    <main
      className={clsx(
        "relative flex min-h-0 flex-1 flex-col overflow-y-auto p-6",
        className,
      )}
    >
      <NavProgress />
      {isNavigating ? <PageSkeleton /> : children}
    </main>
  );
}
