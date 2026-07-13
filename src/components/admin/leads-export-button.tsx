"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DownloadSimple } from "@phosphor-icons/react";

export function LeadsExportButton({ status }: { status?: string }) {
  const [pending, setPending] = useState(false);

  async function handleExport() {
    setPending(true);
    try {
      const params = new URLSearchParams();
      if (status && status !== "all") params.set("status", status);
      const res = await fetch(`/api/admin/leads/export?${params.toString()}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-export-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // allow retry
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
