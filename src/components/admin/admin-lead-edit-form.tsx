"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PencilSimple, X, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { notify } from "@/lib/notify";

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
  onClose,
}: {
  leadId: string;
  initial: LeadFields;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [pending, setPending] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      router.refresh();
      onClose?.();
    } catch {
      notify.error("Failed to save");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
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
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
        {onClose && (
          <button type="button" onClick={onClose} className="btn-secondary btn-sm">
            Cancel
          </button>
        )}
        <button type="submit" disabled={pending} className="btn-primary btn-sm">
          {pending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

export function AdminLeadEditModal({
  leadId,
  initial,
}: {
  leadId: string;
  initial: LeadFields;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary btn-sm inline-flex items-center gap-1"
      >
        <PencilSimple size={12} weight={ICON_WEIGHT_LINEAR} className="shrink-0" aria-hidden />
        Edit Lead
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* Dialog */}
          <div className="relative z-10 w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Edit Lead</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close"
              >
                <X size={18} weight={ICON_WEIGHT_LINEAR} />
              </button>
            </div>
            <div className="px-6 py-5">
              <AdminLeadEditForm
                leadId={leadId}
                initial={initial}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
