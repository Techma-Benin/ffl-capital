"use client";

import { useEffect, useState, useCallback } from "react";
import type { PortalDataTableLayout } from "@/components/ui/portal-data-table";

export function parsePortalDataTableLayout(value: unknown): PortalDataTableLayout {
  return value === "table" ? "table" : "cards";
}

export function usePortalDataTableLayout(storageKey: string) {
  const [layout, setLayoutState] = useState<PortalDataTableLayout>("cards");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setLayoutState(parsePortalDataTableLayout(JSON.parse(raw)));
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(storageKey, JSON.stringify(layout));
  }, [layout, hydrated, storageKey]);

  const setLayout = useCallback((next: PortalDataTableLayout) => {
    setLayoutState(next);
  }, []);

  return { layout, setLayout };
}
