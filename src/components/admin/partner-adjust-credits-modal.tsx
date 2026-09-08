"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ICON_WEIGHT_LINEAR } from "@/lib/icons/client";
import { formatUsd } from "@/lib/format-money";
import { notify } from "@/lib/notify";

type PartnerAdjustCreditsModalProps = {
  partnerId: string;
  displayName: string;
  currentBalance: number;
  remainingUnusedCredit: number;
  onClose: () => void;
};

type Step = "form" | "confirm";
type Mode = "reduce" | "zero";

export function PartnerAdjustCreditsModal({
  partnerId,
  displayName,
  currentBalance,
  remainingUnusedCredit,
  onClose,
}: PartnerAdjustCreditsModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [mode, setMode] = useState<Mode>("reduce");
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
  const reduceAmount =
    mode === "zero"
      ? remainingUnusedCredit
      : Number.isFinite(parsedAmount)
        ? parsedAmount
        : NaN;
  const noteTrimmed = note.trim();

  function validateForm(): string | null {
    if (remainingUnusedCredit <= 0) {
      return "There is no unused admin credit to remove.";
    }
    if (mode === "reduce") {
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return "Enter an amount greater than zero.";
      }
      if (parsedAmount > remainingUnusedCredit) {
        return "Amount cannot exceed unused admin credit.";
      }
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
      const res = await fetch(
        `/api/admin/partners/${partnerId}/adjust-credits`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            amount: mode === "reduce" ? parsedAmount : undefined,
            note: noteTrimmed,
          }),
        },
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Could not update credits");
        setStep("form");
        return;
      }

      if (data.emailWarning) {
        notify.warning(data.emailWarning);
      } else if (mode === "zero") {
        notify.success(
          `${formatUsd(remainingUnusedCredit)} unused credit removed from ${displayName}`,
        );
      } else {
        notify.success(
          `${formatUsd(parsedAmount)} removed from ${displayName}`,
        );
      }

      router.refresh();
      onClose();
    } catch {
      setError("Could not update credits. Please try again.");
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
        aria-labelledby="adjust-credits-modal-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl"
      >
        <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <h2
              id="adjust-credits-modal-title"
              className="text-sm font-semibold text-slate-900"
            >
              Adjust credits
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Unused admin credit for {displayName}:{" "}
              {formatUsd(remainingUnusedCredit)}
              <span className="text-slate-400">
                {" "}
                (wallet {formatUsd(currentBalance)})
              </span>
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
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode("reduce")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    mode === "reduce"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Reduce
                </button>
                <button
                  type="button"
                  onClick={() => setMode("zero")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    mode === "zero"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Set unused to $0
                </button>
              </div>

              {mode === "reduce" ? (
                <div>
                  <label
                    htmlFor="adjust-amount"
                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                  >
                    Amount to remove (USD)
                  </label>
                  <input
                    id="adjust-amount"
                    type="number"
                    min={0.01}
                    max={remainingUnusedCredit}
                    step={0.01}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={loading}
                    placeholder="0.00"
                    className="input w-full"
                  />
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  This removes all unused admin credit (
                  {formatUsd(remainingUnusedCredit)}). Deposited funds stay in
                  the wallet.
                </p>
              )}

              <div>
                <label
                  htmlFor="adjust-note"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Note
                </label>
                <textarea
                  id="adjust-note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={loading}
                  placeholder="Reason for this adjustment…"
                  className="input w-full resize-y"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Confirm credit adjustment</p>
              <dl className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Partner</dt>
                  <dd className="font-medium text-slate-900">{displayName}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Removing</dt>
                  <dd className="font-medium tabular-nums text-slate-900">
                    {formatUsd(reduceAmount)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">New balance</dt>
                  <dd className="font-medium tabular-nums text-slate-900">
                    {formatUsd(
                      Math.max(0, currentBalance - (reduceAmount || 0)),
                    )}
                  </dd>
                </div>
              </dl>
              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
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
                disabled={loading || remainingUnusedCredit <= 0}
                className="btn-primary btn-sm"
              >
                Review
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
                className="btn-primary btn-sm"
              >
                {loading ? "Updating…" : "Confirm"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
