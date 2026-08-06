"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

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
  const searchParams = useSearchParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const currentPath = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;

  useEffect(() => {
    setHydrated(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "true") setSidebarCollapsed(true);
  }, []);

  useEffect(() => {
    setPendingPath(null);
  }, [pathname, searchParams]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const startNavigation = useCallback(
    (href: string) => {
      if (href !== currentPath) setPendingPath(href);
    },
    [currentPath],
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
