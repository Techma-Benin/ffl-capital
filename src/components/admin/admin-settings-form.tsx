"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
    leadTypeConfigsJson: "{}",
    sourceVendorConfigsJson: "{}",
    resaleVendorConfigsJson: "{}",
  });

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
          leadTypeConfigsJson: JSON.stringify(s.lead_type_configs ?? {}, null, 2),
          sourceVendorConfigsJson: JSON.stringify(s.source_vendor_configs ?? {}, null, 2),
          resaleVendorConfigsJson: JSON.stringify(s.resale_vendor_configs ?? {}, null, 2),
        });
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      let leadTypeConfigs = {};
      let sourceVendorConfigs = {};
      let resaleVendorConfigs = {};
      try {
        leadTypeConfigs = JSON.parse(form.leadTypeConfigsJson);
        sourceVendorConfigs = JSON.parse(form.sourceVendorConfigsJson);
        resaleVendorConfigs = JSON.parse(form.resaleVendorConfigsJson);
      } catch {
        setMessage("Invalid JSON in config fields");
        setPending(false);
        return;
      }

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
          leadTypeConfigs,
          sourceVendorConfigs,
          resaleVendorConfigs,
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
    <form onSubmit={handleSave} className="card p-6 space-y-6 max-w-2xl">
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
              setForm({
                ...form,
                integrationsMode: e.target.value as "mock" | "live",
              })
            }
            className="form-select"
          >
            <option value="mock">Mock (log only)</option>
            <option value="live">Live (email, CRM, Integrity)</option>
          </select>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Advanced configs (JSON)</h2>
        <div>
          <label className="form-label">Lead type configs</label>
          <textarea
            rows={4}
            value={form.leadTypeConfigsJson}
            onChange={(e) => setForm({ ...form, leadTypeConfigsJson: e.target.value })}
            className="form-input font-mono text-xs"
          />
        </div>
        <div>
          <label className="form-label">Source vendor configs</label>
          <textarea
            rows={4}
            value={form.sourceVendorConfigsJson}
            onChange={(e) => setForm({ ...form, sourceVendorConfigsJson: e.target.value })}
            className="form-input font-mono text-xs"
          />
        </div>
        <div>
          <label className="form-label">Resale vendor configs</label>
          <textarea
            rows={4}
            value={form.resaleVendorConfigsJson}
            onChange={(e) => setForm({ ...form, resaleVendorConfigsJson: e.target.value })}
            className="form-input font-mono text-xs"
          />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary btn-sm">
          {pending ? "Saving…" : "Save Settings"}
        </button>
        {message && <span className="text-xs text-slate-500">{message}</span>}
      </div>
    </form>
  );
}
