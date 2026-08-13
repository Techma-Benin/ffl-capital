"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  LEAD_FIELD_CATALOG,
  LEAD_FIELD_BY_ALIAS,
  normalizeFieldName,
} from "@/lib/leads/field-catalog";
import { parseCsv as parseCsvDocument } from "@/lib/csv";
import { isFullMigrationCsv } from "@/lib/migration/map-csv-row-to-lead";

// ---------------------------------------------------------------------------
// Field definitions
// ---------------------------------------------------------------------------

const LEAD_FIELDS = LEAD_FIELD_CATALOG.map((field) => ({
  value: field.key,
  label: field.label,
  required: field.required,
  protected: field.protected,
}));

const REQUIRED_FIELDS = new Set(["firstName", "email", "state"]);

/** Auto-detect a lead field from a CSV header using known aliases */
function autoDetectField(csvHeader: string): string {
  return LEAD_FIELD_BY_ALIAS.get(normalizeFieldName(csvHeader)) ?? "skip";
}

// ---------------------------------------------------------------------------
// Stepper UI — matches mockup: dot + label, connecting bar between dots
// ---------------------------------------------------------------------------

const STEPS = ["Upload", "Map Columns", "Preview", "Results"] as const;
type Step = 0 | 1 | 2 | 3;

function Stepper({ current }: { current: Step }) {
  return (
    <div className="flex items-start">
      {STEPS.map((label, idx) => {
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={label} className="flex items-start flex-1 last:flex-none">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 800,
                  border: "2px solid",
                  borderColor: done
                    ? "#605BFF"
                    : active
                    ? "#605BFF"
                    : "#d7d6e0",
                  background: done ? "#605BFF" : "#fff",
                  color: done ? "#fff" : active ? "#605BFF" : "#b3b3bf",
                }}
              >
                {done ? (
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: active
                    ? "#605BFF"
                    : done
                    ? "#605BFF"
                    : "#b3b3bf",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  margin: "15px 8px 0",
                  background: done ? "#605BFF" : "#e8e7f3",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSV parsing helpers (client-side)
// ---------------------------------------------------------------------------

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const [headers = [], ...rows] = parseCsvDocument(text);
  const normalizedHeaders = headers.map((h) => normalizeFieldName(h));
  return { headers: normalizedHeaders, rows };
}

/** Apply column mapping to a raw row array, returning keyed object */
function applyMapping(
  headers: string[],
  cols: string[],
  mapping: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((h, idx) => {
    const field = mapping[h];
    if (!field || field === "skip") return;
    result[field] = cols[idx] ?? "";
  });
  return result;
}

// ---------------------------------------------------------------------------
// Main wizard component
// ---------------------------------------------------------------------------

type ImportResult = {
  jobId: string;
  successRows: number;
  errorRows: number;
  errors?: string[];
};

export function AdminImportWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);

  // Step 1
  const [file, setFile] = useState<File | null>(null);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [fullMigration, setFullMigration] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // Step 4
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // -------------------------------------------------------------------------
  // Template download
  // -------------------------------------------------------------------------

  function handleDownloadTemplate() {
    window.location.href = "/api/admin/migration/import";
  }

  // -------------------------------------------------------------------------
  // Step 1 — file selection
  // -------------------------------------------------------------------------

  async function loadFile(f: File | null) {
    setFile(f);
    if (!f) return;
    const text = await f.text();
    const { headers, rows } = parseCsv(text);
    setParsedHeaders(headers);
    setParsedRows(rows);
    setFullMigration(isFullMigrationCsv(headers));
    // Auto-initialize mapping
    const autoMapping: Record<string, string> = {};
    headers.forEach((h) => {
      autoMapping[h] = autoDetectField(h);
    });
    setMapping(autoMapping);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    await loadFile(e.target.files?.[0] ?? null);
  }

  async function handleFileDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    await loadFile(e.dataTransfer.files?.[0] ?? null);
  }

  function handleProceedToMap() {
    setStep(fullMigration ? 2 : 1);
  }

  // -------------------------------------------------------------------------
  // Step 2 — column mapping
  // -------------------------------------------------------------------------

  function handleMappingChange(csvHeader: string, fieldValue: string) {
    setMapping((prev) => ({ ...prev, [csvHeader]: fieldValue }));
  }

  function handleProceedToPreview() {
    setStep(2);
  }

  // -------------------------------------------------------------------------
  // Step 3 — preview
  // -------------------------------------------------------------------------

  const previewRows = parsedRows.slice(0, 5).map((cols) =>
    applyMapping(parsedHeaders, cols, mapping),
  );

  function isCellMissing(fieldName: string, value: string | undefined): boolean {
    return REQUIRED_FIELDS.has(fieldName) && (!value || value.trim() === "");
  }

  const mappedFields = Object.entries(mapping)
    .filter(([, f]) => f && f !== "skip")
    .map(([, f]) => f);

  async function handleImport() {
    if (!file) return;
    setPending(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    if (!fullMigration) formData.append("columnMapping", JSON.stringify(mapping));

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
        errorRows: parsedRows.length,
        errors: [err instanceof Error ? err.message : "Import failed"],
      });
    } finally {
      setPending(false);
      setStep(3);
    }
  }

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------

  function handleReset() {
    setStep(0);
    setFile(null);
    setParsedHeaders([]);
    setParsedRows([]);
    setFullMigration(false);
    setMapping({});
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // -------------------------------------------------------------------------
  // Render — stepper outside the card, step content inside card
  // -------------------------------------------------------------------------

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Stepper */}
      <Stepper current={step} />

      {/* Step content card */}
      <div
        className="bg-white rounded-[14px] shadow-[0_6px_24px_-14px_rgba(79,78,105,0.25)]"
        style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}
      >
        {/* ---------------------------------------------------------------- */}
        {/* Step 0 — Upload                                                   */}
        {/* ---------------------------------------------------------------- */}
        {step === 0 && (
          <>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#030229" }}>
                Select a CSV file
              </div>
              <p className="text-[12.5px] text-[#8b8a99] mt-1 leading-relaxed">
                Download the template to see the expected columns. Any CSV with
                recognisable headers will be accepted.
              </p>
            </div>

            {/* Drop zone */}
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              style={{
                border: "2px dashed #dcdaea",
                borderRadius: 13,
                padding: 30,
                textAlign: "center",
                background: "#fbfbfe",
                cursor: "pointer",
                display: "block",
              }}
              className="hover:border-brand-400 hover:bg-brand-50/40 transition-colors"
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {file ? (
                  <svg
                    width={30}
                    height={30}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#605BFF"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <path d="M14 2v6h6M8 13l2.5 2.5L16 10" />
                  </svg>
                ) : (
                  <svg
                    width={30}
                    height={30}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#b3b3bf"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 7.5L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                )}
                {file ? (
                  <span
                    style={{ fontSize: 13.5, fontWeight: 800, color: "#605BFF" }}
                  >
                    {file.name}
                  </span>
                ) : (
                  <>
                    <span
                      style={{ fontSize: 13.5, fontWeight: 800, color: "#4a495c" }}
                    >
                      Click to choose a file
                    </span>
                    <span className="text-[12.5px] text-[#8b8a99]">
                      CSV up to 50 MB
                    </span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            {file && parsedHeaders.length > 0 && (
              <p className="text-[12.5px] text-[#8b8a99] font-extrabold">
                Detected <strong>{parsedHeaders.length}</strong> columns and{" "}
                <strong>{parsedRows.length}</strong> data rows.
              </p>
            )}

            {/* Footer: Download template (left) + Next (right) */}
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="btn-secondary btn-sm"
              >
                Download template
              </button>
              <button
                type="button"
                disabled={!file || parsedHeaders.length === 0}
                onClick={handleProceedToMap}
                className="btn-primary btn-sm disabled:opacity-50"
              >
                {fullMigration ? "Next: Preview →" : "Next: Map Columns →"}
              </button>
            </div>
          </>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Step 1 — Map Columns                                              */}
        {/* ---------------------------------------------------------------- */}
        {step === 1 && (
          <>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#030229" }}>
                Map CSV columns to lead fields
              </div>
              <p className="text-[12.5px] text-[#8b8a99] mt-1 leading-relaxed">
                We&apos;ve pre-filled what we could detect. Adjust any mappings
                below, or choose &quot;— skip —&quot; to ignore a column.
              </p>
            </div>

            <div className="overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-600 w-1/2">
                      CSV Column
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-600 w-1/2">
                      Lead Field
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedHeaders.map((h) => (
                    <tr key={h} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-mono text-slate-700">{h}</td>
                      <td className="px-4 py-2">
                        <select
                          value={mapping[h] ?? "skip"}
                          onChange={(e) => handleMappingChange(h, e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="skip">— skip —</option>
                          {LEAD_FIELDS.map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                              {f.required ? " *" : ""}
                              {f.protected ? " (system field)" : ""}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-slate-500">* Required field</p>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="btn-secondary btn-sm"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleProceedToPreview}
                className="btn-primary btn-sm"
              >
                Next: Preview →
              </button>
            </div>
          </>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Step 2 — Preview                                                  */}
        {/* ---------------------------------------------------------------- */}
        {step === 2 && (
          <>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#030229" }}>
                Preview first {Math.min(5, parsedRows.length)} rows
              </div>
              <p className="text-[12.5px] text-[#8b8a99] mt-1 leading-relaxed">
                Red cells indicate missing required fields (First Name, Email,
                State). Fix your CSV or adjust mappings before importing.
              </p>
            </div>

            <div className="overflow-auto rounded-lg border border-slate-200 text-sm">
              <table className="min-w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-medium text-slate-600 w-8">
                      #
                    </th>
                    {mappedFields.map((f) => {
                      const def = LEAD_FIELDS.find((x) => x.value === f);
                      return (
                        <th
                          key={f}
                          className="px-3 py-2.5 text-left font-medium text-slate-600 whitespace-nowrap"
                        >
                          {def?.label ?? f}
                          {def?.required && (
                            <span className="text-red-500 ml-0.5">*</span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewRows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                      {mappedFields.map((f) => {
                        const val = row[f];
                        const missing = isCellMissing(f, val);
                        return (
                          <td
                            key={f}
                            className={`px-3 py-2 whitespace-nowrap ${
                              missing
                                ? "bg-red-50 text-red-700 font-medium"
                                : "text-slate-700"
                            }`}
                          >
                            {missing ? (
                              <span className="italic opacity-70">missing</span>
                            ) : (
                              val || (
                                <span className="text-slate-300 italic">—</span>
                              )
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {parsedRows.length > 5 && (
              <p className="text-xs text-slate-500">
                Showing 5 of {parsedRows.length} rows. All rows will be imported.
              </p>
            )}

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(fullMigration ? 0 : 1)}
                className="btn-secondary btn-sm"
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={handleImport}
                className="btn-primary btn-sm disabled:opacity-50"
              >
                {pending ? "Importing…" : `Import ${parsedRows.length} rows`}
              </button>
            </div>
          </>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Step 3 — Results                                                  */}
        {/* ---------------------------------------------------------------- */}
        {step === 3 && result && (
          <>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#030229" }}>
              Import complete
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
                <p className="text-3xl font-bold text-green-700">
                  {result.successRows}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  Imported successfully
                </p>
              </div>
              <div
                className={`rounded-lg p-4 text-center border ${
                  result.errorRows > 0
                    ? "bg-red-50 border-red-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <p
                  className={`text-3xl font-bold ${
                    result.errorRows > 0 ? "text-red-700" : "text-slate-400"
                  }`}
                >
                  {result.errorRows}
                </p>
                <p
                  className={`text-sm mt-1 ${
                    result.errorRows > 0 ? "text-red-600" : "text-slate-500"
                  }`}
                >
                  Errors
                </p>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">
                  Row errors ({result.errors.length})
                </h3>
                <div className="rounded-lg border border-red-200 bg-red-50 max-h-64 overflow-y-auto">
                  <ul className="divide-y divide-red-100 text-sm text-red-800">
                    {result.errors.map((e, i) => (
                      <li key={i} className="px-4 py-2 font-mono">
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="btn-primary btn-sm"
              >
                Import another file
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
