"use client";

import { Suspense } from "react";
import { PortalProvider } from "@/components/layout/portal-provider";

export function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <PortalProvider>{children}</PortalProvider>
    </Suspense>
  );
}
