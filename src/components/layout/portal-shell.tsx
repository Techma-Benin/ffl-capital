"use client";

import { PortalProvider } from "@/components/layout/portal-provider";

/**
 * Portal shell provider — wraps admin/partner layouts with navigation state.
 * Visual shell (sidebar + header + page bg) lives in the route layouts;
 * shared tokens: Integrity primary, accent green, page bg `#F4F7FB`.
 *
 * Navigation pending uses useSearchParams inside PortalProvider (Suspense
 * boundary there) so query-only navigations show loading feedback.
 */
export function PortalShell({ children }: { children: React.ReactNode }) {
  return <PortalProvider>{children}</PortalProvider>;
}
