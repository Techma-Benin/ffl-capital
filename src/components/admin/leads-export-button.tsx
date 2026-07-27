"use client";

import { useState } from "react";
import { DownloadSimple } from "@/lib/icons/client";
import { useActionFeedback } from "@/components/ui/action-feedback";
import { getApiErrorMessage } from "@/lib/client-api-error";

export function LeadsExportButton({ viewId }: { viewId: string }) {
  const [pending, setPending] = useState(false);
  const { notify } = useActionFeedback();

  async function handleExport() {
    setPending(true);
    try {
      const params = new URLSearchParams();
      params.set("viewId", viewId);
      const res = await fetch(`/api/admin/leads/export?${params.toString()}`);
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, "Could not export leads."));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-export-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      notify({ kind: "success", title: "Lead export downloaded" });
    } catch (error) {
      notify({
        kind: "error",
        title: "Lead export failed",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={pending}
      className="btn-secondary btn-sm inline-flex items-center gap-1.5"
    >
      <DownloadSimple size={14} />
      {pending ? "Exporting…" : "Export CSV"}
    </button>
  );
}
