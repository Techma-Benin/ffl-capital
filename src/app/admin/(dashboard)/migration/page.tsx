"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";

// ---------------------------------------------------------------------------
// Field definitions
// ---------------------------------------------------------------------------

const LEAD_FIELDS: { value: string; label: string; required?: boolean }[] = [
  { value: "firstName", label: "First Name", required: true },
  { value: "lastName", label: "Last Name" },
  { value: "email", label: "Email", required: true },
  { value: "phone", label: "Phone" },
  { value: "state", label: "State", required: true },
  { value: "leadType", label: "Lead Type" },
  { value: "address", label: "Address" },
  { value: "city", label: "City" },
  { value: "zip", label: "ZIP Code" },
  { value: "dob", label: "Date of Birth" },
  { value: "age", label: "Age" },
  { value: "intent", label: "Intent" },
  { value: "haveIul", label: "Have IUL" },
  { value: "primaryGoal", label: "Primary Goal" },
  { value: "trustedformCertUrl", label: "TrustedForm Cert URL" },
  { value: "tcpaConsent", label: "TCPA Consent" },
  { value: "tcpaLanguage", label: "TCPA Language" },
  { value: "leadidToken", label: "LeadID Token" },
  { value: "source", label: "Source" },
  { value: "landingPage", label: "Landing Page" },
  { value: "subId", label: "Sub ID" },
  { value: "pubId", label: "Pub ID" },
  { value: "boberdooLeadType", label: "Boberdoo Lead Type" },
  { value: "ipAddress", label: "IP Address" },
  { value: "userAgent", label: "User Agent" },
  { value: "externalId", label: "External ID" },
  { value: "receivedAt", label: "Received At" },
];

const REQUIRED_FIELDS = new Set(["firstName", "email", "state"]);

/** Auto-detect a lead field from a CSV header using known aliases */
const ALIAS_MAP: Record<string, string> = {
  first_name: "firstName",
  firstname: "firstName",
  last_name: "lastName",
  lastname: "lastName",
  email: "email",
  phone: "phone",
  primary_phone: "phone",
  state: "state",
  state_you_currently_live_in: "state",
  lead_type: "leadType",
  classification: "leadType",
  address: "address",
  city: "city",
  zip: "zip",
  dob: "dob",
  date_of_birth: "dob",
  age: "age",
  intent: "intent",
  have_iul: "haveIul",
  haveiul: "haveIul",
  primary_goal: "primaryGoal",
  primarygoal: "primaryGoal",
  trustedform_cert_url: "trustedformCertUrl",
  trusted_form_url: "trustedformCertUrl",
  tcpa_consent: "tcpaConsent",
  tcpa_language: "tcpaLanguage",
  leadid_token: "leadidToken",
  leadi_d_token: "leadidToken",
  source: "source",
  src: "source",
  landing_page: "landingPage",
  sub_id: "subId",
  pub_id: "pubId",
  boberdoo_lead_type: "boberdooLeadType",
  lead_type_id: "boberdooLeadType",
  ip_address: "ipAddress",
  user_agent: "userAgent",
  external_id: "externalId",
  unique_identifier: "externalId",
  received_at: "receivedAt",
};

function autoDetectField(csvHeader: string): string {
  return ALIAS_MAP[csvHeader.toLowerCase().replace(/\s+/g, "_")] ?? "skip";
}

// ---------------------------------------------------------------------------
// Stepper UI
// ---------------------------------------------------------------------------

const STEPS = ["Upload", "Map Columns", "Preview", "Results"] as const;
type Step = 0 | 1 | 2 | 3;

function Stepper({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, idx) => {
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                  done
                    ? "bg-brand-600 border-brand-600 text-white"
                    : active
                    ? "border-brand-600 text-brand-600 bg-white"
                    : "border-slate-300 text-slate-400 bg-white"
                }`}
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
                className={`text-xs font-medium whitespace-nowrap ${
                  active ? "text-brand-700" : done ? "text-brand-600" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 mb-5 transition-colors ${
                  done ? "bg-brand-600" : "bg-slate-200"
                }`}
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

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/\s+/g, "_"),
  );
  const rows = lines.slice(1).map((l) => parseCsvLine(l));
  return { headers, rows };
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
// Main wizard page
// ---------------------------------------------------------------------------

type ImportResult = {
  jobId: string;
  successRows: number;
  errorRows: number;
  errors?: string[];
};

export default function AdminMigrationPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);

  // Step 1
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string>("");
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (!f) return;
    const text = await f.text();
    setCsvText(text);
    const { headers, rows } = parseCsv(text);
    setParsedHeaders(headers);
    setParsedRows(rows);
    // Auto-initialize mapping
    const autoMapping: Record<string, string> = {};
    headers.forEach((h) => {
      autoMapping[h] = autoDetectField(h);
    });
    setMapping(autoMapping);
  }

  function handleProceedToMap() {
    setStep(1);
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
    formData.append("columnMapping", JSON.stringify(mapping));

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
    setCsvText("");
    setParsedHeaders([]);
    setParsedRows([]);
    setMapping({});
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div>
      <PageHeader
        title="Lead Import"
        subtitle="Import leads from a CSV file"
        action={
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="btn-secondary btn-sm flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Download Template
          </button>
        }
      />

      <div className="max-w-3xl">
        <Stepper current={step} />

        {/* ---------------------------------------------------------------- */}
        {/* Step 0 — Upload                                                   */}
        {/* ---------------------------------------------------------------- */}
        {step === 0 && (
          <div className="card p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-1">
                Select a CSV file
              </h2>
              <p className="text-sm text-slate-500">
                Download the template above to see the expected columns. Any
                CSV with recognisable headers will be accepted.
              </p>
            </div>

            <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors">
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <svg className="w-8 h-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                {file ? (
                  <span className="text-sm font-medium text-brand-700">{file.name}</span>
                ) : (
                  <>
                    <span className="text-sm font-medium">Click to choose a file</span>
                    <span className="text-xs">CSV up to 50 MB</span>
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
              <p className="text-sm text-slate-600">
                Detected <strong>{parsedHeaders.length}</strong> columns and{" "}
                <strong>{parsedRows.length}</strong> data rows.
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                disabled={!file || parsedHeaders.length === 0}
                onClick={handleProceedToMap}
                className="btn-primary btn-sm disabled:opacity-50"
              >
                Next: Map Columns →
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Step 1 — Map Columns                                              */}
        {/* ---------------------------------------------------------------- */}
        {step === 1 && (
          <div className="card p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-1">
                Map CSV columns to lead fields
              </h2>
              <p className="text-sm text-slate-500">
                We&apos;ve pre-filled what we could detect. Adjust any mappings below,
                or choose &quot;— skip —&quot; to ignore a column.
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
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Step 2 — Preview                                                  */}
        {/* ---------------------------------------------------------------- */}
        {step === 2 && (
          <div className="card p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-1">
                Preview first {Math.min(5, parsedRows.length)} rows
              </h2>
              <p className="text-sm text-slate-500">
                Red cells indicate missing required fields (First Name, Email,
                State). Fix your CSV or adjust mappings before importing.
              </p>
            </div>

            <div className="overflow-auto rounded-lg border border-slate-200 text-sm">
              <table className="min-w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-medium text-slate-600 w-8">#</th>
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
                onClick={() => setStep(1)}
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
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Step 3 — Results                                                  */}
        {/* ---------------------------------------------------------------- */}
        {step === 3 && result && (
          <div className="card p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-1">
                Import complete
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
                <p className="text-3xl font-bold text-green-700">
                  {result.successRows}
                </p>
                <p className="text-sm text-green-600 mt-1">Imported successfully</p>
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
          </div>
        )}
      </div>
    </div>
  );
}
