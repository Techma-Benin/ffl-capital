"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ADMIN_PARTNERS_VISIBLE_COLUMNS_KEY,
  defaultPartnersColumnVisibility,
  parsePartnersColumnVisibility,
  type PartnerHideableColumnKey,
  type PartnersColumnVisibilityState,
} from "@/lib/admin/partners-table-columns";

export function usePartnersColumnVisibility() {
  const [visibility, setVisibility] = useState<PartnersColumnVisibilityState>(
    defaultPartnersColumnVisibility,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADMIN_PARTNERS_VISIBLE_COLUMNS_KEY);
      if (raw) {
        setVisibility(parsePartnersColumnVisibility(JSON.parse(raw)));
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      ADMIN_PARTNERS_VISIBLE_COLUMNS_KEY,
      JSON.stringify(visibility),
    );
  }, [visibility, hydrated]);

  const setColumnVisible = useCallback(
    (key: PartnerHideableColumnKey, visible: boolean) => {
      setVisibility((prev) => ({ ...prev, [key]: visible }));
    },
    [],
  );

  return { visibility, setColumnVisible };
}
