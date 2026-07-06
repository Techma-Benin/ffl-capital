"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";

export default function AdminMigrationPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{
    jobId: string;
    successRows: number;
    errorRows: number;
  } | null>(null);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setPending(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/migration/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setResult(data);
      router.refresh();
    } catch (err) {
      setResult({
        jobId: "",
        successRows: 0,
        errorRows: 1,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Boberdoo Migration"
        subtitle="Import leads from a Boberdoo CSV export"
      />

      <form onSubmit={handleImport} className="card p-6 max-w-lg space-y-4">
        <p className="text-sm text-slate-600">
          CSV columns: first_name, last_name, email, phone, state, lead_type, received_at (optional)
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700"
        />
        <button
          type="submit"
          disabled={!file || pending}
          className="btn-primary btn-sm disabled:opacity-50"
        >
          {pending ? "Importing…" : "Import CSV"}
        </button>
        {result && (
          <p className="text-sm text-slate-600">
            Imported {result.successRows} rows
            {result.errorRows > 0 && `, ${result.errorRows} errors`}
          </p>
        )}
      </form>
    </div>
  );
}
