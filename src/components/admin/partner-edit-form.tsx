"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useActionFeedback } from "@/components/ui/action-feedback";
import { getApiErrorMessage } from "@/lib/client-api-error";

export type PartnerEditFormInitial = {
  priority: number;
  priceOverride: number | null;
  status: string;
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
  { value: "pending_approval", label: "Pending" },
  { value: "rejected", label: "Rejected" },
] as const;

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
  const { notify } = useActionFeedback();

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
        }),
      });
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, "Could not save partner."));
      }
      notify({ kind: "success", title: "Partner changes saved" });
      router.refresh();
      onSaved?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Please try again.";
      setMessage(errorMessage);
      notify({
        kind: "error",
        title: "Partner changes were not saved",
        message: errorMessage,
      });
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
          <label className="form-label" id="partner-edit-status-label">
            Status
          </label>
          <select
            id="partner-edit-status"
            aria-labelledby="partner-edit-status-label"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="form-input"
          >
            {STATUS_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        CRM outbound is configured by the partner under Settings → CRM outbound.
      </p>

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
