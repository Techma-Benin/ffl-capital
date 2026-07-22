"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { usePortal } from "@/components/layout/portal-provider";

/** Client navigation that triggers global pending UI (NavProgress + MainContent skeleton). */
export function useNavigateWithPending() {
  const router = useRouter();
  const { startNavigation } = usePortal();

  const push = useCallback(
    (href: string) => {
      startNavigation(href);
      router.push(href);
    },
    [router, startNavigation],
  );

  const replace = useCallback(
    (href: string) => {
      startNavigation(href);
      router.replace(href);
    },
    [router, startNavigation],
  );

  return { push, replace, router };
}
