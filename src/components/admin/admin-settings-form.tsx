"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* ─── types ─────────────────────────────────────────────────────────────── */

interface ResaleVendorRow {
  key: string;
  enabled: boolean;
  pingUrl: string;
  postUrl: string;
}

/* ─── helpers ───────────────────────────────────────────────────────────── */

function buildResaleRows(
  resaleConfigs: Record<string, { enabled?: boolean; pingUrl?: string; postUrl?: string }>,
): ResaleVendorRow[] {
  return Object.entries(resaleConfigs).map(([key, cfg]) => ({
    key,
    enabled: cfg.enabled ?? true,
    pingUrl: cfg.pingUrl ?? "",
    postUrl: cfg.postUrl ?? "",
  }));
}

function resaleToPayload(rows: ResaleVendorRow[]) {
  const resaleVendorConfigs: Record<string, object> = {};
  for (const row of rows) {
    if (!row.key.trim()) continue;
    resaleVendorConfigs[row.key.trim()] = {
      enabled: row.enabled,
      pingUrl: row.pingUrl,
      postUrl: row.postUrl,
    };
  }
  return resaleVendorConfigs;
}

/* ─── modal components ──────────────────────────────────────────────────── */

function ModalOverlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="form-label mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-400 mb-1">{hint}</p>}
      {children}
    </div>
  );
}

/* ─── resale vendor modal ───────────────────────────────────────────────── */

function ResaleVendorModal({
  initial,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  initial: ResaleVendorRow;
  isNew: boolean;
  onSave: (row: ResaleVendorRow) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [row, setRow] = useState<ResaleVendorRow>(initial);

  function set(patch: Partial<ResaleVendorRow>) {
    setRow((r) => ({ ...r, ...patch }));
  }

  return (
    <ModalOverlay
      title={isNew ? "Add resale vendor" : `Edit — ${initial.key}`}
      onClose={onClose}
    >
      <Field label="Vendor key" hint="Internal identifier (e.g. integrity, leadconduit)">
        <input
          type="text"
          value={row.key}
          onChange={(e) => set({ key: e.target.value })}
          disabled={!isNew}
          placeholder="e.g. integrity"
          className="form-input font-mono text-sm disabled:bg-slate-50 disabled:text-slate-500"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={row.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
          className="rounded border-slate-300"
        />
        Enabled — send leads to this vendor
      </label>

      <Field label="Ping URL" hint="Optional availability check endpoint">
        <input
          type="url"
          value={row.pingUrl}
          onChange={(e) => set({ pingUrl: e.target.value })}
          placeholder="https://…"
          className="form-input text-sm"
        />
      </Field>

      <Field label="Post URL" hint="Lead delivery endpoint">
        <input
          type="url"
          value={row.postUrl}
          onChange={(e) => set({ postUrl: e.target.value })}
          placeholder="https://…"
          className="form-input text-sm"
        />
      </Field>

      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
        <button type="button" onClick={() => onSave(row)} className="btn-primary btn-sm">
          Save
        </button>
        <button
          type="button"
          onClick={onClose}
          className="btn-sm border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg px-3 py-1.5 text-sm font-medium"
        >
          Cancel
        </button>
        {!isNew && (
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium"
          >
            Remove vendor
          </button>
        )}
      </div>
    </ModalOverlay>
  );
}

/* ─── main form ─────────────────────────────────────────────────────────── */

export function AdminSettingsForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    defaultRealtimePrice: 25,
    defaultAgedPrice: 5,
    adminApprovalRequired: true,
    integrationsMode: "mock" as "mock" | "live",
    agedDaysThreshold: 30,
    trustedformValidationEnabled: false,
    duplicateCheckEnabled: true,
    duplicateCheckWindowDays: 30,
    integrityPostDelayHours: 24,
  });

  const [resaleVendors, setResaleVendors] = useState<ResaleVendorRow[]>([]);

  const [resaleModal, setResaleModal] = useState<{
    row: ResaleVendorRow;
    index: number | null;
  } | null>(null);

  /* load */
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
          integrityPostDelayHours: Number(s.integrity_post_delay_hours ?? 24),
        });
        setResaleVendors(
          buildResaleRows(
            (s.resale_vendor_configs as Record<
              string,
              { enabled?: boolean; pingUrl?: string; postUrl?: string }
            > | undefined) ?? {},
          ),
        );
      })
      .finally(() => setLoading(false));
  }, []);

  /* save */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const resaleVendorConfigs = resaleToPayload(resaleVendors);
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
          resaleVendorConfigs,
          integrityPostDelayHours: form.integrityPostDelayHours,
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

  /* resale handlers */
  function openNewResale() {
    setResaleModal({ row: { key: "", enabled: true, pingUrl: "", postUrl: "" }, index: null });
  }
  function openEditResale(row: ResaleVendorRow, index: number) {
    setResaleModal({ row, index });
  }
  function saveResale(row: ResaleVendorRow) {
    if (resaleModal === null) return;
    if (resaleModal.index === null) {
      setResaleVendors((prev) => [...prev, row]);
    } else {
      setResaleVendors((prev) => prev.map((r, i) => (i === resaleModal.index ? row : r)));
    }
    setResaleModal(null);
  }
  function deleteResale() {
    if (resaleModal?.index == null) return;
    setResaleVendors((prev) => prev.filter((_, i) => i !== resaleModal.index));
    setResaleModal(null);
  }

  if (loading) {
    return <div className="card p-6 text-sm text-slate-500">Loading settings…</div>;
  }

  return (
    <>
      {resaleModal && (
        <ResaleVendorModal
          initial={resaleModal.row}
          isNew={resaleModal.index === null}
          onSave={saveResale}
          onDelete={deleteResale}
          onClose={() => setResaleModal(null)}
        />
      )}

      <form onSubmit={handleSave} className="card p-6 space-y-8 max-w-2xl">
        {/* ── Pricing ─────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Pricing</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">Default realtime price ($)</label>
              <input
                type="number"
                min={1}
                step={0.01}
                value={form.defaultRealtimePrice}
                onChange={(e) =>
                  setForm({ ...form, defaultRealtimePrice: Number(e.target.value) })
                }
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
                onChange={(e) =>
                  setForm({ ...form, defaultAgedPrice: Number(e.target.value) })
                }
                className="form-input"
              />
            </div>
          </div>
        </section>

        {/* ── Lead lifecycle ───────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Lead lifecycle</h2>
          <div>
            <label className="form-label">Aged days threshold</label>
            <input
              type="number"
              min={1}
              value={form.agedDaysThreshold}
              onChange={(e) =>
                setForm({ ...form, agedDaysThreshold: Number(e.target.value) })
              }
              className="form-input"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.trustedformValidationEnabled}
              onChange={(e) =>
                setForm({ ...form, trustedformValidationEnabled: e.target.checked })
              }
              className="rounded border-slate-300"
            />
            Enable TrustedForm validation on intake
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.duplicateCheckEnabled}
              onChange={(e) =>
                setForm({ ...form, duplicateCheckEnabled: e.target.checked })
              }
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
              onChange={(e) =>
                setForm({ ...form, duplicateCheckWindowDays: Number(e.target.value) })
              }
              className="form-input"
            />
          </div>
        </section>

        {/* ── Platform ─────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Platform</h2>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.adminApprovalRequired}
              onChange={(e) =>
                setForm({ ...form, adminApprovalRequired: e.target.checked })
              }
              className="rounded border-slate-300"
            />
            Require admin approval for new partners
          </label>
          <div>
            <label className="form-label">Integrations mode</label>
            <select
              value={form.integrationsMode}
              onChange={(e) =>
                setForm({ ...form, integrationsMode: e.target.value as "mock" | "live" })
              }
              className="form-select"
            >
              <option value="mock">Mock (log only)</option>
              <option value="live">Live (email, CRM, Integrity)</option>
            </select>
          </div>
          <div>
            <label className="form-label">
              Send unmatched leads to Integrity after (hours)
            </label>
            <p className="text-xs text-slate-400 mb-1">
              How long a lead sits unmatched before the nightly job forwards it to Integrity
              Connect. Default is 24 hours.
            </p>
            <input
              type="number"
              min={1}
              value={form.integrityPostDelayHours}
              onChange={(e) =>
                setForm({ ...form, integrityPostDelayHours: Number(e.target.value) })
              }
              className="form-input"
            />
          </div>
        </section>

        {/* ── Resale vendors ───────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Resale vendors</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Third-party platforms that receive leads from this system. Click a row to edit.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2.5 text-left">Vendor</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-left">Post URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resaleVendors.map((row, i) => (
                  <tr
                    key={row.key || i}
                    onClick={() => openEditResale(row, i)}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{row.key}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.enabled
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {row.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[240px] truncate">
                      {row.postUrl || <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
                {resaleVendors.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-xs text-slate-400">
                      No resale vendors configured
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={openNewResale}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            + Add vendor
          </button>
        </section>

        {/* ── save bar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <button type="submit" disabled={pending} className="btn-primary btn-sm">
            {pending ? "Saving…" : "Save Settings"}
          </button>
          {message && (
            <span
              className={`text-xs ${
                message === "Settings saved" ? "text-green-600" : "text-red-500"
              }`}
            >
              {message}
            </span>
          )}
        </div>
      </form>
    </>
  );
}
