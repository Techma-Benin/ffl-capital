"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";

type PortalContextValue = {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  pendingPath: string | null;
  startNavigation: (href: string) => void;
  isNavigating: boolean;
};

const PortalContext = createContext<PortalContextValue | null>(null);

const STORAGE_KEY = "ffl-sidebar-collapsed";

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "true") setSidebarCollapsed(true);
  }, []);

  // Reset navigation indicator whenever the pathname changes.
  // We intentionally omit searchParams here to avoid requiring a Suspense
  // boundary (useSearchParams triggers streaming Suspense in App Router).
  useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const startNavigation = useCallback(
    (href: string) => {
      // Compare against pathname only (ignoring search params) to keep this
      // hook free from useSearchParams and its Suspense requirement.
      const hrefPath = href.split("?")[0];
      if (hrefPath !== pathname) setPendingPath(href);
    },
    [pathname],
  );

  return (
    <PortalContext.Provider
      value={{
        sidebarCollapsed: hydrated ? sidebarCollapsed : false,
        toggleSidebar,
        pendingPath,
        startNavigation,
        isNavigating: pendingPath !== null,
      }}
    >
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) {
    throw new Error("usePortal must be used within PortalProvider");
  }
  return ctx;
}
