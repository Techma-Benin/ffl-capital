"use client";

import { Suspense } from "react";
import { PortalProvider } from "@/components/layout/portal-provider";

/**
 * Portal shell provider — wraps admin/partner layouts with navigation state.
 * Visual shell (sidebar + header + page bg) lives in the route layouts;
 * shared tokens: Integrity primary, accent green, page bg `#F4F7FB`.
 */
export function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <PortalProvider>{children}</PortalProvider>
    </Suspense>
  );
}
