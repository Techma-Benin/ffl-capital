"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type PartnerEditFormInitial = {
  priority: number;
  priceOverride: number | null;
  status: string;
  crmProvider: string;
  crmWebhookUrl: string | null;
  ringySid: string | null;
  ringyAuthToken: string | null;
};

type PartnerEditFormProps = {
  partnerId: string;
  initial: PartnerEditFormInitial;
  variant?: "page" | "modal";
  onSaved?: () => void;
  onCancel?: () => void;
};

export function PartnerEditForm({
  partnerId,
  initial,
  variant = "page",
  onSaved,
  onCancel,
}: PartnerEditFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/partners/${partnerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priority: form.priority,
          priceOverride: form.priceOverride,
          status: form.status,
          crmProvider: form.crmProvider,
          crmWebhookUrl: form.crmWebhookUrl || null,
          ringySid: form.ringySid || null,
          ringyAuthToken: form.ringyAuthToken || null,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      router.refresh();
      onSaved?.();
    } catch {
      setMessage("Failed to save — try again");
    } finally {
      setPending(false);
    }
  }

  const isModal = variant === "modal";

  return (
    <form
      onSubmit={handleSave}
      className={
        isModal ? "space-y-5" : "card scroll-mt-24 space-y-5 rounded-xl p-6"
      }
    >
      {!isModal && (
        <h2 className="text-sm font-semibold text-slate-900">Edit Partner</h2>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="form-label">Priority (1–10)</label>
          <input
            type="number"
            min={1}
            max={10}
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Price Override ($)</label>
          <input
            type="number"
            min={1}
            step={0.01}
            placeholder="Default"
            value={form.priceOverride ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                priceOverride: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="form-select"
          >
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
            <option value="pending_approval">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          CRM & Delivery
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">CRM Provider</label>
            <select
              value={form.crmProvider}
              onChange={(e) => setForm({ ...form, crmProvider: e.target.value })}
              className="form-select"
            >
              <option value="email_only">Email only</option>
              <option value="webhook">Webhook</option>
              <option value="ringy">Ringy</option>
            </select>
          </div>
          <div>
            <label className="form-label">CRM Webhook URL</label>
            <input
              type="url"
              placeholder="https://"
              value={form.crmWebhookUrl ?? ""}
              onChange={(e) =>
                setForm({ ...form, crmWebhookUrl: e.target.value || null })
              }
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Ringy SID</label>
            <input
              type="text"
              value={form.ringySid ?? ""}
              onChange={(e) => setForm({ ...form, ringySid: e.target.value || null })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Ringy Auth Token</label>
            <input
              type="password"
              value={form.ringyAuthToken ?? ""}
              onChange={(e) =>
                setForm({ ...form, ringyAuthToken: e.target.value || null })
              }
              className="form-input"
            />
          </div>
        </div>
      </div>

      <div
        className={
          isModal
            ? "flex flex-shrink-0 items-center justify-between gap-3 border-t border-slate-100 pt-5"
            : "flex items-center gap-3"
        }
      >
        {isModal && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary btn-sm"
            disabled={pending}
          >
            Cancel
          </button>
        ) : null}
        <div className={`flex items-center gap-3 ${isModal ? "ml-auto" : ""}`}>
          <button type="submit" disabled={pending} className="btn-primary btn-sm">
            {pending ? "Saving…" : "Save Changes"}
          </button>
          {message && (
            <span
              className={`text-xs ${message.includes("Failed") ? "text-red-600" : "text-slate-500"}`}
            >
              {message}
            </span>
          )}
        </div>
      </div>
    </form>
  );
}
