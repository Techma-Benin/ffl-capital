"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ADMIN_LEADS_VISIBLE_COLUMNS_KEY,
  defaultAdminLeadsColumnVisibility,
  parseAdminLeadsColumnVisibility,
  type AdminLeadHideableColumnKey,
  type AdminLeadsColumnVisibilityState,
} from "@/lib/admin/admin-leads-table-display";

export function useAdminLeadsColumnVisibility() {
  const [visibility, setVisibility] = useState<AdminLeadsColumnVisibilityState>(
    defaultAdminLeadsColumnVisibility,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADMIN_LEADS_VISIBLE_COLUMNS_KEY);
      if (raw) {
        setVisibility(parseAdminLeadsColumnVisibility(JSON.parse(raw)));
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      ADMIN_LEADS_VISIBLE_COLUMNS_KEY,
      JSON.stringify(visibility),
    );
  }, [visibility, hydrated]);

  const setColumnVisible = useCallback(
    (key: AdminLeadHideableColumnKey, visible: boolean) => {
      setVisibility((prev) => ({ ...prev, [key]: visible }));
    },
    [],
  );

  return { visibility, setColumnVisible };
}
