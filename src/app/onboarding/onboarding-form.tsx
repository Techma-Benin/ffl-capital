"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { US_STATE_CODES } from "@/lib/constants/us-states";
import { AlertCircle, Check, MapPin } from "lucide-react";

const US_STATE_NAMES: Record<string, string> = {
  AL:"Alabama", AK:"Alaska", AZ:"Arizona", AR:"Arkansas", CA:"California",
  CO:"Colorado", CT:"Connecticut", DE:"Delaware", FL:"Florida", GA:"Georgia",
  HI:"Hawaii", ID:"Idaho", IL:"Illinois", IN:"Indiana", IA:"Iowa",
  KS:"Kansas", KY:"Kentucky", LA:"Louisiana", ME:"Maine", MD:"Maryland",
  MA:"Massachusetts", MI:"Michigan", MN:"Minnesota", MS:"Mississippi", MO:"Missouri",
  MT:"Montana", NE:"Nebraska", NV:"Nevada", NH:"New Hampshire", NJ:"New Jersey",
  NM:"New Mexico", NY:"New York", NC:"North Carolina", ND:"North Dakota", OH:"Ohio",
  OK:"Oklahoma", OR:"Oregon", PA:"Pennsylvania", RI:"Rhode Island", SC:"South Carolina",
  SD:"South Dakota", TN:"Tennessee", TX:"Texas", UT:"Utah", VT:"Vermont",
  VA:"Virginia", WA:"Washington", WV:"West Virginia", WI:"Wisconsin", WY:"Wyoming",
};

export default function OnboardingForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2>(1);

  function toggleState(code: string) {
    setSelectedStates((prev) =>
      prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code],
    );
  }

  function selectAll() { setSelectedStates([...US_STATE_CODES]); }
  function clearAll()  { setSelectedStates([]); }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (selectedStates.length < 15) {
      setError("Please select at least 15 target states.");
      return;
    }
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      firstName:      form.get("firstName"),
      lastName:       form.get("lastName"),
      affiliation:    form.get("affiliation"),
      residenceState: form.get("residenceState"),
      leadType:       form.get("leadType"),
      filterStates:   selectedStates,
    };

    try {
      const res = await fetch("/api/partners/onboarding", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Onboarding failed");
        return;
      }
      router.push("/partner");
      router.refresh();
    } catch {
      setError("Request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isEligible = selectedStates.length >= 15;

  return (
    <form onSubmit={handleSubmit}>
      {/* Step 1 — Profile */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">First Name</label>
              <input name="firstName" required className="form-input" placeholder="James" />
            </div>
            <div>
              <label className="form-label">Last Name</label>
              <input name="lastName" required className="form-input" placeholder="Wilson" />
            </div>
          </div>
          <div>
            <label className="form-label">Company / Affiliation</label>
            <input
              name="affiliation"
              required
              className="form-input"
              placeholder="e.g. Family First Life"
            />
            <p className="mt-1 text-xs text-slate-400">
              The agency or company you work with
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">Residence State</label>
              <select name="residenceState" required className="form-select">
                <option value="">Select state…</option>
                {US_STATE_CODES.map((s) => (
                  <option key={s} value={s}>{US_STATE_NAMES[s]} ({s})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Lead Type</label>
              <select name="leadType" required className="form-select">
                <option value="high_intent_iul">High Intent IUL</option>
                <option value="traditional_iul">Traditional IUL</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn-primary w-full justify-center"
            >
              Continue — Select Target States →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — State selection */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <MapPin size={14} className="text-brand-600" />
                Select Target States
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Minimum <strong>15 states</strong> required to receive leads
              </p>
            </div>
            <span
              className={`text-sm font-bold ${isEligible ? "text-emerald-600" : "text-amber-600"}`}
            >
              {selectedStates.length} / 50
            </span>
          </div>

          {!isEligible && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              <AlertCircle size={13} className="flex-shrink-0" />
              Select {15 - selectedStates.length} more state{15 - selectedStates.length !== 1 ? "s" : ""} to continue
            </div>
          )}

          {/* Quick selects */}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={selectAll} className="btn-secondary btn-sm">All 50</button>
            <button type="button" onClick={clearAll}  className="btn-secondary btn-sm">Clear</button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-10">
            {US_STATE_CODES.map((code) => {
              const sel = selectedStates.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleState(code)}
                  title={US_STATE_NAMES[code]}
                  className={`relative flex flex-col items-center rounded-lg border-2 px-1.5 py-2 text-center transition-all ${
                    sel
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-200 bg-white text-slate-500 hover:border-brand-300 hover:bg-brand-50/50"
                  }`}
                >
                  <span className="text-xs font-bold">{code}</span>
                  {sel && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-600 text-[8px] font-bold text-white">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-secondary"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={loading || !isEligible}
              className="btn-primary flex-1 justify-center"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Setting up your account…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check size={15} />
                  Complete Onboarding
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
