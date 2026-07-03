"use client";

import { usePortal } from "@/components/layout/portal-provider";

export function NavProgress() {
  const { isNavigating } = usePortal();

  if (!isNavigating) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-brand-100"
      aria-hidden
    >
      <div className="h-full w-1/3 animate-nav-progress bg-brand-600 motion-reduce:animate-none motion-reduce:w-full" />
    </div>
  );
}
