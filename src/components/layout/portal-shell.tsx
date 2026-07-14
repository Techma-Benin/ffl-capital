"use client";

import { PortalProvider } from "@/components/layout/portal-provider";

/**
 * Portal shell provider — wraps admin/partner layouts with navigation state.
 * Visual shell (sidebar + header + page bg) lives in the route layouts;
 * shared tokens: Integrity primary, accent green, page bg `#F4F7FB`.
 *
 * Note: PortalProvider previously used useSearchParams, which required a
 * Suspense wrapper here. That hook was removed (usePathname is used instead),
 * so the Suspense is no longer needed and has been removed to prevent
 * SSR/hydration mismatches that caused "Invalid hook call" crashes on the
 * partner and admin dashboard pages.
 */
export function PortalShell({ children }: { children: React.ReactNode }) {
  return <PortalProvider>{children}</PortalProvider>;
}
