"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Wallet, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { formatUsd } from "@/lib/format-money";
import { notify } from "@/lib/notify";

type PartnerGrantCreditsModalProps = {
  partnerId: string;
  displayName: string;
  isSuperAdmin: boolean;
  onClose: () => void;
};

type Step = "form" | "confirm";

export function PartnerGrantCreditsModal({
  partnerId,
  displayName,
  isSuperAdmin,
  onClose,
}: PartnerGrantCreditsModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, loading]);

  const parsedAmount = parseFloat(amount);
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const noteTrimmed = note.trim();

  function validateForm(): string | null {
    if (!amountValid) return "Enter a valid amount greater than zero.";
    if (!isSuperAdmin) {
      if (parsedAmount < 0.01) return "Minimum grant amount is $0.01.";
      if (parsedAmount > 1000) return "Maximum grant amount is $1,000.00.";
    }
    return null;
  }

  function handleReview() {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep("confirm");
  }

  async function handleSubmit() {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setStep("form");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/partners/${partnerId}/grant-credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsedAmount, note: noteTrimmed }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Could not grant credits");
        setStep("form");
        return;
      }

      if (data.emailWarning) {
        notify.warning(data.emailWarning);
      } else {
        notify.success(
          `${formatUsd(parsedAmount)} credited to ${displayName}`,
        );
      }

      router.refresh();
      onClose();
    } catch {
      setError("Could not grant credits. Please try again.");
      setStep("form");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="absolute inset-0"
        onClick={loading ? undefined : onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-labelledby="grant-credits-modal-title"
        aria-describedby="grant-credits-modal-desc"
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl"
      >
        <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <h2
              id="grant-credits-modal-title"
              className="text-sm font-semibold text-slate-900"
            >
              Grant credits
            </h2>
            <p id="grant-credits-modal-desc" className="mt-0.5 text-xs text-slate-500">
              Add wallet credits for {displayName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={16} weight={ICON_WEIGHT_LINEAR} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === "form" ? (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="grant-amount"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Amount (USD)
                </label>
                <input
                  id="grant-amount"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                  placeholder="0.00"
                  className="input w-full"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {isSuperAdmin
                    ? "No maximum for super admins."
                    : "Maximum $1,000.00 per grant."}
                </p>
              </div>

              <div>
                <label
                  htmlFor="grant-note"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Note
                </label>
                <textarea
                  id="grant-note"
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={loading}
                  placeholder="Reason for this credit grant…"
                  className="input w-full resize-y"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600" role="alert">{error}</p>
              )}
            </div>
          ) : (
            <div className="space-y-3 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Confirm credit grant</p>
              <dl className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Partner</dt>
                  <dd className="font-medium text-slate-900">{displayName}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Amount</dt>
                  <dd className="font-medium tabular-nums text-slate-900">
                    {formatUsd(parsedAmount)}
                  </dd>
                </div>
                {noteTrimmed ? (
                  <div>
                    <dt className="text-slate-500">Note</dt>
                    <dd className="mt-1 text-slate-900">{noteTrimmed}</dd>
                  </div>
                ) : null}
              </dl>

              {error && (
                <p className="text-sm text-red-600" role="alert">{error}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          {step === "form" ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReview}
                disabled={loading}
                className="btn-primary btn-sm"
              >
                Review grant
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setError(null);
                }}
                disabled={loading}
                className="btn-secondary btn-sm"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary btn-sm inline-flex items-center gap-1.5"
              >
                {loading ? "Granting…" : "Confirm grant"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
