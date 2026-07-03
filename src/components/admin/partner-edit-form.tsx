"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PartnerEditFormProps = {
  partnerId: string;
  initial: {
    priority: number;
    priceOverride: number | null;
    status: string;
  };
};

export function PartnerEditForm({ partnerId, initial }: PartnerEditFormProps) {
  const router = useRouter();
  const [priority, setPriority] = useState(initial.priority);
  const [priceOverride, setPriceOverride] = useState(
    initial.priceOverride?.toString() ?? "",
  );
  const [status, setStatus] = useState(initial.status);
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
          priority,
          priceOverride: priceOverride ? Number(priceOverride) : null,
          status,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setMessage("Saved successfully");
      router.refresh();
    } catch {
      setMessage("Failed to save — try again");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="card p-6 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">Edit Partner</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="form-label">Priority (1–10)</label>
          <input
            type="number"
            min={1}
            max={10}
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
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
            value={priceOverride}
            onChange={(e) => setPriceOverride(e.target.value)}
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="form-select"
          >
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
            <option value="pending_approval">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary btn-sm">
          {pending ? "Saving…" : "Save Changes"}
        </button>
        {message && (
          <span className="text-xs text-slate-500">{message}</span>
        )}
      </div>
    </form>
  );
}
