"use client";

import { PortalProvider } from "@/components/layout/portal-provider";

export function PortalShell({ children }: { children: React.ReactNode }) {
  return <PortalProvider>{children}</PortalProvider>;
}
