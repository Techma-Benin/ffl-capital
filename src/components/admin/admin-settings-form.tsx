"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash } from "@phosphor-icons/react";

// ---------------------------------------------------------------------------
// Structured config row types
// ---------------------------------------------------------------------------

type LeadTypeRow = {
  name: string;
  defaultPrice: number;
  retentionDays: number;
  active: boolean;
  _key: string; // internal list key
};

type SourceVendorRow = {
  identifier: string;
  label: string;
  matchingEnabled: boolean;
  _key: string;
};

type ResaleVendorRow = {
  identifier: string;
  pingUrl: string;
  postUrl: string;
  enabled: boolean;
  _key: string;
};

function makeKey() {
  return Math.random().toString(36).slice(2);
}

// ---------------------------------------------------------------------------
// Helpers — convert between JSON object and UI row arrays
// ---------------------------------------------------------------------------

function leadTypeConfigsToRows(obj: Record<string, unknown>): LeadTypeRow[] {
  return Object.entries(obj).map(([name, v]) => {
    const val = (v as Record<string, unknown>) ?? {};
    return {
      name,
      defaultPrice: Number(val.defaultPrice ?? 25),
      retentionDays: Number(val.retentionDays ?? 30),
      active: val.active !== false,
      _key: makeKey(),
    };
  });
}

function rowsToLeadTypeConfigs(rows: LeadTypeRow[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    if (!row.name.trim()) continue;
    result[row.name.trim()] = {
      defaultPrice: row.defaultPrice,
      retentionDays: row.retentionDays,
      active: row.active,
    };
  }
  return result;
}

function sourceVendorConfigsToRows(obj: Record<string, unknown>): SourceVendorRow[] {
  return Object.entries(obj).map(([id, v]) => {
    const val = (v as Record<string, unknown>) ?? {};
    return {
      identifier: id,
      label: String(val.label ?? ""),
      matchingEnabled: val.matchingEnabled !== false,
      _key: makeKey(),
    };
  });
}

function rowsToSourceVendorConfigs(rows: SourceVendorRow[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    if (!row.identifier.trim()) continue;
    result[row.identifier.trim()] = {
      label: row.label.trim() || undefined,
      matchingEnabled: row.matchingEnabled,
    };
  }
  return result;
}

function resaleVendorConfigsToRows(obj: Record<string, unknown>): ResaleVendorRow[] {
  return Object.entries(obj).map(([id, v]) => {
    const val = (v as Record<string, unknown>) ?? {};
    return {
      identifier: id,
      pingUrl: String(val.pingUrl ?? ""),
      postUrl: String(val.postUrl ?? ""),
      enabled: val.enabled !== false,
      _key: makeKey(),
    };
  });
}

function rowsToResaleVendorConfigs(rows: ResaleVendorRow[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    if (!row.identifier.trim()) continue;
    result[row.identifier.trim()] = {
      pingUrl: row.pingUrl.trim() || undefined,
      postUrl: row.postUrl.trim() || undefined,
      enabled: row.enabled,
    };
  }
  return result;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateRows(
  leadTypeRows: LeadTypeRow[],
  sourceRows: SourceVendorRow[],
  resaleRows: ResaleVendorRow[],
): string | null {
  const ltNames = leadTypeRows.map((r) => r.name.trim()).filter(Boolean);
  if (new Set(ltNames).size !== ltNames.length) return "Lead type names must be unique.";

  const srcIds = sourceRows.map((r) => r.identifier.trim()).filter(Boolean);
  if (new Set(srcIds).size !== srcIds.length) return "Source vendor identifiers must be unique.";

  const resaleIds = resaleRows.map((r) => r.identifier.trim()).filter(Boolean);
  if (new Set(resaleIds).size !== resaleIds.length) return "Resale vendor identifiers must be unique.";

  for (const row of resaleRows) {
    if (row.pingUrl.trim() && !/^https?:\/\/.+/.test(row.pingUrl.trim())) {
      return `Resale vendor "${row.identifier}": Ping URL must start with http:// or https://.`;
    }
    if (row.postUrl.trim() && !/^https?:\/\/.+/.test(row.postUrl.trim())) {
      return `Resale vendor "${row.identifier}": Post URL must start with http:// or https://.`;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-slate-900">{children}</h2>;
}

function TableHead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr>
        {cols.map((c) => (
          <th key={c} className="pb-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {c}
          </th>
        ))}
        <th className="pb-2 w-8" />
      </tr>
    </thead>
  );
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------

export function AdminSettingsForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Scalar settings
  const [form, setForm] = useState({
    defaultRealtimePrice: 25,
    defaultAgedPrice: 5,
    adminApprovalRequired: true,
    integrationsMode: "mock" as "mock" | "live",
    agedDaysThreshold: 30,
    trustedformValidationEnabled: false,
    duplicateCheckEnabled: true,
    duplicateCheckWindowDays: 30,
  });

  // Structured config rows
  const [leadTypeRows, setLeadTypeRows] = useState<LeadTypeRow[]>([]);
  const [sourceRows, setSourceRows] = useState<SourceVendorRow[]>([]);
  const [resaleRows, setResaleRows] = useState<ResaleVendorRow[]>([]);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        const s = data.settings ?? {};
        setForm({
          defaultRealtimePrice: Number(s.default_realtime_price ?? 25),
          defaultAgedPrice: Number(s.default_aged_price ?? 5),
          adminApprovalRequired: Boolean(s.admin_approval_required ?? true),
          integrationsMode: (s.integrations_mode as "mock" | "live") ?? "mock",
          agedDaysThreshold: Number(s.aged_days_threshold ?? 30),
          trustedformValidationEnabled: Boolean(s.trustedform_validation_enabled ?? false),
          duplicateCheckEnabled: Boolean(s.duplicate_check_enabled ?? true),
          duplicateCheckWindowDays: Number(s.duplicate_check_window_days ?? 30),
        });
        setLeadTypeRows(leadTypeConfigsToRows((s.lead_type_configs as Record<string, unknown>) ?? {}));
        setSourceRows(sourceVendorConfigsToRows((s.source_vendor_configs as Record<string, unknown>) ?? {}));
        setResaleRows(resaleVendorConfigsToRows((s.resale_vendor_configs as Record<string, unknown>) ?? {}));
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateRows(leadTypeRows, sourceRows, resaleRows);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultRealtimePrice: form.defaultRealtimePrice,
          defaultAgedPrice: form.defaultAgedPrice,
          adminApprovalRequired: form.adminApprovalRequired,
          integrationsMode: form.integrationsMode,
          agedDaysThreshold: form.agedDaysThreshold,
          trustedformValidationEnabled: form.trustedformValidationEnabled,
          duplicateCheckEnabled: form.duplicateCheckEnabled,
          duplicateCheckWindowDays: form.duplicateCheckWindowDays,
          leadTypeConfigs: rowsToLeadTypeConfigs(leadTypeRows),
          sourceVendorConfigs: rowsToSourceVendorConfigs(sourceRows),
          resaleVendorConfigs: rowsToResaleVendorConfigs(resaleRows),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setMessage("Settings saved");
      router.refresh();
    } catch {
      setMessage("Failed to save");
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return <div className="card p-6 text-sm text-slate-500">Loading settings…</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">

      {/* ------------------------------------------------------------------ */}
      {/* Pricing */}
      {/* ------------------------------------------------------------------ */}
      <div className="card p-6 space-y-4">
        <SectionHeader>Pricing</SectionHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">Default realtime price ($)</label>
            <input
              type="number"
              min={1}
              step={0.01}
              value={form.defaultRealtimePrice}
              onChange={(e) => setForm({ ...form, defaultRealtimePrice: Number(e.target.value) })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Default aged price ($)</label>
            <input
              type="number"
              min={1}
              step={0.01}
              value={form.defaultAgedPrice}
              onChange={(e) => setForm({ ...form, defaultAgedPrice: Number(e.target.value) })}
              className="form-input"
            />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Lead lifecycle */}
      {/* ------------------------------------------------------------------ */}
      <div className="card p-6 space-y-4">
        <SectionHeader>Lead lifecycle</SectionHeader>
        <div>
          <label className="form-label">Aged days threshold</label>
          <input
            type="number"
            min={1}
            value={form.agedDaysThreshold}
            onChange={(e) => setForm({ ...form, agedDaysThreshold: Number(e.target.value) })}
            className="form-input"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.trustedformValidationEnabled}
            onChange={(e) => setForm({ ...form, trustedformValidationEnabled: e.target.checked })}
            className="rounded border-slate-300"
          />
          Enable TrustedForm validation on intake
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.duplicateCheckEnabled}
            onChange={(e) => setForm({ ...form, duplicateCheckEnabled: e.target.checked })}
            className="rounded border-slate-300"
          />
          Enable duplicate lead checks
        </label>
        <div>
          <label className="form-label">Duplicate check window (days)</label>
          <input
            type="number"
            min={1}
            value={form.duplicateCheckWindowDays}
            onChange={(e) => setForm({ ...form, duplicateCheckWindowDays: Number(e.target.value) })}
            className="form-input"
          />
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Platform */}
      {/* ------------------------------------------------------------------ */}
      <div className="card p-6 space-y-4">
        <SectionHeader>Platform</SectionHeader>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.adminApprovalRequired}
            onChange={(e) => setForm({ ...form, adminApprovalRequired: e.target.checked })}
            className="rounded border-slate-300"
          />
          Require admin approval for new partners
        </label>
        <div>
          <label className="form-label">Integrations mode</label>
          <select
            value={form.integrationsMode}
            onChange={(e) => setForm({ ...form, integrationsMode: e.target.value as "mock" | "live" })}
            className="form-select"
          >
            <option value="mock">Mock (log only)</option>
            <option value="live">Live (email, CRM, Integrity)</option>
          </select>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Lead type configs */}
      {/* ------------------------------------------------------------------ */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <SectionHeader>Lead type configs</SectionHeader>
          <button
            type="button"
            onClick={() =>
              setLeadTypeRows((prev) => [
                ...prev,
                { name: "", defaultPrice: 25, retentionDays: 30, active: true, _key: makeKey() },
              ])
            }
            className="btn-secondary btn-sm inline-flex items-center gap-1"
          >
            <Plus size={12} /> Add row
          </button>
        </div>
        {leadTypeRows.length === 0 ? (
          <p className="text-xs text-slate-400">No lead type configs defined. Click "Add row" to create one.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <TableHead cols={["Name", "Default price ($)", "Retention days", "Active"]} />
              <tbody className="divide-y divide-slate-100">
                {leadTypeRows.map((row, i) => (
                  <tr key={row._key}>
                    <td className="py-2 pr-3">
                      <input
                        className="form-input text-xs"
                        value={row.name}
                        placeholder="e.g. traditional_iul"
                        onChange={(e) =>
                          setLeadTypeRows((prev) =>
                            prev.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)),
                          )
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="form-input text-xs w-28"
                        value={row.defaultPrice}
                        onChange={(e) =>
                          setLeadTypeRows((prev) =>
                            prev.map((r, j) => (j === i ? { ...r, defaultPrice: Number(e.target.value) } : r)),
                          )
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        min={1}
                        className="form-input text-xs w-28"
                        value={row.retentionDays}
                        onChange={(e) =>
                          setLeadTypeRows((prev) =>
                            prev.map((r, j) => (j === i ? { ...r, retentionDays: Number(e.target.value) } : r)),
                          )
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={row.active}
                        onChange={(e) =>
                          setLeadTypeRows((prev) =>
                            prev.map((r, j) => (j === i ? { ...r, active: e.target.checked } : r)),
                          )
                        }
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => setLeadTypeRows((prev) => prev.filter((_, j) => j !== i))}
                        className="rounded p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Remove row"
                      >
                        <Trash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Source vendor configs */}
      {/* ------------------------------------------------------------------ */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <SectionHeader>Source vendor configs</SectionHeader>
          <button
            type="button"
            onClick={() =>
              setSourceRows((prev) => [
                ...prev,
                { identifier: "", label: "", matchingEnabled: true, _key: makeKey() },
              ])
            }
            className="btn-secondary btn-sm inline-flex items-center gap-1"
          >
            <Plus size={12} /> Add row
          </button>
        </div>
        {sourceRows.length === 0 ? (
          <p className="text-xs text-slate-400">No source vendor configs defined. Click "Add row" to create one.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <TableHead cols={["Identifier", "Label", "Matching enabled"]} />
              <tbody className="divide-y divide-slate-100">
                {sourceRows.map((row, i) => (
                  <tr key={row._key}>
                    <td className="py-2 pr-3">
                      <input
                        className="form-input text-xs"
                        value={row.identifier}
                        placeholder="e.g. meta_leadconduit"
                        onChange={(e) =>
                          setSourceRows((prev) =>
                            prev.map((r, j) => (j === i ? { ...r, identifier: e.target.value } : r)),
                          )
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        className="form-input text-xs"
                        value={row.label}
                        placeholder="Display label"
                        onChange={(e) =>
                          setSourceRows((prev) =>
                            prev.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)),
                          )
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={row.matchingEnabled}
                        onChange={(e) =>
                          setSourceRows((prev) =>
                            prev.map((r, j) => (j === i ? { ...r, matchingEnabled: e.target.checked } : r)),
                          )
                        }
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => setSourceRows((prev) => prev.filter((_, j) => j !== i))}
                        className="rounded p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Remove row"
                      >
                        <Trash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Resale vendor configs */}
      {/* ------------------------------------------------------------------ */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <SectionHeader>Resale vendor configs</SectionHeader>
          <button
            type="button"
            onClick={() =>
              setResaleRows((prev) => [
                ...prev,
                { identifier: "", pingUrl: "", postUrl: "", enabled: true, _key: makeKey() },
              ])
            }
            className="btn-secondary btn-sm inline-flex items-center gap-1"
          >
            <Plus size={12} /> Add row
          </button>
        </div>
        {resaleRows.length === 0 ? (
          <p className="text-xs text-slate-400">No resale vendor configs defined. Click "Add row" to create one.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <TableHead cols={["Identifier", "Ping URL", "Post URL", "Enabled"]} />
              <tbody className="divide-y divide-slate-100">
                {resaleRows.map((row, i) => (
                  <tr key={row._key}>
                    <td className="py-2 pr-3">
                      <input
                        className="form-input text-xs"
                        value={row.identifier}
                        placeholder="e.g. boberdoo"
                        onChange={(e) =>
                          setResaleRows((prev) =>
                            prev.map((r, j) => (j === i ? { ...r, identifier: e.target.value } : r)),
                          )
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        className="form-input text-xs"
                        value={row.pingUrl}
                        placeholder="https://…"
                        onChange={(e) =>
                          setResaleRows((prev) =>
                            prev.map((r, j) => (j === i ? { ...r, pingUrl: e.target.value } : r)),
                          )
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        className="form-input text-xs"
                        value={row.postUrl}
                        placeholder="https://…"
                        onChange={(e) =>
                          setResaleRows((prev) =>
                            prev.map((r, j) => (j === i ? { ...r, postUrl: e.target.value } : r)),
                          )
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={(e) =>
                          setResaleRows((prev) =>
                            prev.map((r, j) => (j === i ? { ...r, enabled: e.target.checked } : r)),
                          )
                        }
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => setResaleRows((prev) => prev.filter((_, j) => j !== i))}
                        className="rounded p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Remove row"
                      >
                        <Trash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Save */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary btn-sm">
          {pending ? "Saving…" : "Save Settings"}
        </button>
        {message && (
          <span className={`text-xs ${message === "Settings saved" ? "text-emerald-600" : "text-red-600"}`}>
            {message}
          </span>
        )}
      </div>
    </form>
  );
}
