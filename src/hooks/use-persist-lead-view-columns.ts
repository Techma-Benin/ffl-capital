"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mergeColumnsWithCatalog } from "@/lib/leads/list-view-columns";
import type { LeadColumnDef } from "@/lib/leads/list-view-columns";
import type { LeadViewColumn } from "@/lib/leads/list-view-schema";

const SAVE_DEBOUNCE_MS = 400;

function columnsEqual(a: LeadViewColumn[], b: LeadViewColumn[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function usePersistLeadViewColumns({
  apiBase,
  activeViewId,
  activeViewColumns,
  catalog,
  onPersisted,
}: {
  apiBase: string;
  activeViewId: string;
  activeViewColumns: unknown;
  catalog: LeadColumnDef[];
  onPersisted?: () => void;
}) {
  const [draftColumns, setDraftColumns] = useState<LeadViewColumn[] | null>(
    null,
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const pendingPayload = useRef<LeadViewColumn[] | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);

  const serverColumns = Array.isArray(activeViewColumns)
    ? mergeColumnsWithCatalog(catalog, activeViewColumns as LeadViewColumn[])
    : mergeColumnsWithCatalog(catalog, []);

  const columns = draftColumns ?? serverColumns;

  useEffect(() => {
    setDraftColumns(null);
    setSaveError(null);
    pendingPayload.current = null;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
  }, [activeViewId]);

  useEffect(() => {
    if (!draftColumns) return;
    if (columnsEqual(serverColumns, draftColumns)) {
      setDraftColumns(null);
    }
  }, [serverColumns, draftColumns]);

  const patchColumns = useCallback(
    async (next: LeadViewColumn[]) => {
      const normalized = mergeColumnsWithCatalog(catalog, next);
      const res = await fetch(`${apiBase}/${activeViewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columns: normalized }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" ? data.error : "Request failed",
        );
      }
      onPersisted?.();
    },
    [apiBase, activeViewId, catalog, onPersisted],
  );

  const flushSave = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const payload = pendingPayload.current;
    if (!payload || saving.current) return;
    saving.current = true;
    setSaveError(null);
    try {
      await patchColumns(payload);
      pendingPayload.current = null;
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Could not save column settings",
      );
      setDraftColumns(null);
      pendingPayload.current = null;
    } finally {
      saving.current = false;
    }
  }, [patchColumns]);

  const scheduleSave = useCallback(
    (next: LeadViewColumn[]) => {
      const normalized = mergeColumnsWithCatalog(catalog, next);
      setDraftColumns(normalized);
      setSaveError(null);
      pendingPayload.current = normalized;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void flushSave();
      }, SAVE_DEBOUNCE_MS);
    },
    [catalog, flushSave],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return {
    columns,
    saveColumns: scheduleSave,
    flushColumnsSave: flushSave,
    columnsSaveError: saveError,
  };
}
