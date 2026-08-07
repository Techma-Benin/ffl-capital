"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  buildFullPath,
  normalizeNavigationHref,
} from "@/lib/navigation/normalize-href";

type PortalContextValue = {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  pendingPath: string | null;
  startNavigation: (href: string) => void;
  isNavigating: boolean;
};

const PortalContext = createContext<PortalContextValue | null>(null);

const STORAGE_KEY = "ffl-sidebar-collapsed";

/** Tailwind `lg` — desktop shell; below this the sidebar auto-collapses. */
const DESKTOP_MIN_WIDTH_PX = 1024;

function isDesktopViewport(): boolean {
  return window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`).matches;
}

type NavigationLocationRef = MutableRefObject<{ fullPath: string }>;

function PortalNavigationSync({
  locationRef,
  onLocationChange,
}: {
  locationRef: NavigationLocationRef;
  onLocationChange: (fullPath: string) => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const fullPath = useMemo(
    () => buildFullPath(pathname, searchParams.toString()),
    [pathname, searchParams],
  );

  useEffect(() => {
    locationRef.current.fullPath = fullPath;
    onLocationChange(fullPath);
  }, [fullPath, locationRef, onLocationChange]);

  return null;
}

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const locationRef = useRef({ fullPath: pathname });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);
    const applyViewportSidebar = () => {
      if (!isDesktopViewport()) {
        setSidebarCollapsed(true);
        return;
      }
      setSidebarCollapsed(localStorage.getItem(STORAGE_KEY) === "true");
    };
    applyViewportSidebar();

    const mql = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`);
    const onChange = () => applyViewportSidebar();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    locationRef.current.fullPath = pathname;
  }, [pathname]);

  const onLocationChange = useCallback((fullPath: string) => {
    setPendingPath((pending) => {
      if (!pending) return pending;
      return normalizeNavigationHref(pending) === normalizeNavigationHref(fullPath)
        ? null
        : pending;
    });
  }, []);

  const startNavigation = useCallback(
    (href: string) => {
      const current =
        locationRef.current.fullPath ||
        buildFullPath(pathname, "");
      if (normalizeNavigationHref(href) !== normalizeNavigationHref(current)) {
        setPendingPath(href);
      }
    },
    [pathname],
  );

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      // Persist preference only on desktop so auto-collapse does not overwrite it.
      if (isDesktopViewport()) {
        localStorage.setItem(STORAGE_KEY, String(next));
      }
      return next;
    });
  }, []);

  const value: PortalContextValue = {
    sidebarCollapsed: hydrated ? sidebarCollapsed : false,
    toggleSidebar,
    pendingPath,
    startNavigation,
    isNavigating: pendingPath !== null,
  };

  return (
    <PortalContext.Provider value={value}>
      <Suspense fallback={null}>
        <PortalNavigationSync
          locationRef={locationRef}
          onLocationChange={onLocationChange}
        />
      </Suspense>
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

/** Match pending navigation to a link href (order-insensitive query). */
export function isNavigationPending(
  pendingPath: string | null,
  href: string,
): boolean {
  if (!pendingPath || !href) return false;
  return (
    normalizeNavigationHref(pendingPath) === normalizeNavigationHref(href)
  );
}
