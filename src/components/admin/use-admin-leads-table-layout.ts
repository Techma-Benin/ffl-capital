"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ADMIN_LEADS_TABLE_LAYOUT_KEY,
  parseAdminLeadsTableLayout,
  type AdminLeadsTableLayout,
} from "@/lib/admin/admin-leads-table-display";

export function useAdminLeadsTableLayout() {
  const [layout, setLayoutState] = useState<AdminLeadsTableLayout>("cards");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADMIN_LEADS_TABLE_LAYOUT_KEY);
      if (raw) {
        setLayoutState(parseAdminLeadsTableLayout(JSON.parse(raw)));
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(ADMIN_LEADS_TABLE_LAYOUT_KEY, JSON.stringify(layout));
  }, [layout, hydrated]);

  const setLayout = useCallback((next: AdminLeadsTableLayout) => {
    setLayoutState(next);
  }, []);

  return { layout, setLayout };
}
