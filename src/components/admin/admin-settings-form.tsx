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
        });
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
    <form onSubmit={handleSave} className="card p-6 space-y-5 max-w-xl">
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
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="adminApproval"
          checked={form.adminApprovalRequired}
          onChange={(e) =>
            setForm({ ...form, adminApprovalRequired: e.target.checked })
          }
          className="rounded border-slate-300"
        />
        <label htmlFor="adminApproval" className="text-sm text-slate-700">
          Require admin approval for new partners
        </label>
      </div>
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
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary btn-sm">
          {pending ? "Saving…" : "Save Settings"}
        </button>
        {message && <span className="text-xs text-slate-500">{message}</span>}
      </div>
    </form>
  );
}
