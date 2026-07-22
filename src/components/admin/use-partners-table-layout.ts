"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ADMIN_PARTNERS_TABLE_LAYOUT_KEY,
  parsePartnersTableLayout,
  type PartnersTableLayout,
} from "@/lib/admin/partners-table-columns";

export function usePartnersTableLayout() {
  const [layout, setLayoutState] = useState<PartnersTableLayout>("cards");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADMIN_PARTNERS_TABLE_LAYOUT_KEY);
      if (raw) {
        setLayoutState(parsePartnersTableLayout(JSON.parse(raw)));
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(ADMIN_PARTNERS_TABLE_LAYOUT_KEY, JSON.stringify(layout));
  }, [layout, hydrated]);

  const setLayout = useCallback((next: PartnersTableLayout) => {
    setLayoutState(next);
  }, []);

  return { layout, setLayout };
}
