"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LeadFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  intent: string | null;
  haveIul: string | null;
  primaryGoal: string | null;
};

export function AdminLeadEditForm({
  leadId,
  initial,
}: {
  leadId: string;
  initial: LeadFields;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      setMessage("Saved");
      router.refresh();
    } catch {
      setMessage("Failed to save");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="card p-6 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">Edit Lead</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["firstName", "First Name"],
            ["lastName", "Last Name"],
            ["email", "Email"],
            ["phone", "Phone"],
            ["address", "Address"],
            ["city", "City"],
            ["state", "State"],
            ["zip", "Zip"],
            ["intent", "Intent"],
            ["haveIul", "Have IUL"],
            ["primaryGoal", "Primary Goal"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="form-label">{label}</label>
            <input
              type="text"
              value={form[key] ?? ""}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="form-input"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary btn-sm">
          {pending ? "Saving…" : "Save Changes"}
        </button>
        {message && <span className="text-xs text-slate-500">{message}</span>}
      </div>
    </form>
  );
}
