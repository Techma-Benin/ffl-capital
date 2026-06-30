"use client";

import { useState } from "react";
import { Zap, CheckCircle, AlertCircle } from "lucide-react";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

const SAMPLE_LEADS = [
  { firstName: "Jane", lastName: "Doe",      email: "jane@example.com",  phone: "5125550100", state: "TX", intent: "High Intent" },
  { firstName: "Marcus", lastName: "Johnson", email: "marcus@test.com",   phone: "4045551234", state: "GA", intent: "Traditional" },
  { firstName: "Sarah", lastName: "Williams", email: "sarah@lead.test",   phone: "3235559876", state: "CA", intent: "High Intent" },
  { firstName: "Robert", lastName: "Davis",   email: "rdavis@example.com",phone: "2125550001", state: "NY", intent: "Traditional" },
];

export default function LeadSimulator() {
  const [result, setResult] = useState<{ ok: boolean; data: unknown } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sample, setSample] = useState(SAMPLE_LEADS[0]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      First_Name:        form.get("firstName"),
      Last_Name:         form.get("lastName"),
      Email:             form.get("email"),
      Primary_Phone:     form.get("phone"),
      State:             form.get("state"),
      Intent:            form.get("intent"),
      Trusted_Form_URL:  form.get("trustedform") || `https://cert.trustedform.com/dev-${Date.now()}`,
      Unique_Identifier: `sim-${Date.now()}`,
      SRC:               "dev_simulator",
    };

    try {
      const res  = await fetch("/api/leads/intake", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      setResult({ ok: res.ok, data });
    } catch (err) {
      setResult({ ok: false, data: err instanceof Error ? err.message : "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Form */}
      <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-4">
        {/* Quick sample selector */}
        <div>
          <label className="form-label">Quick Fill (sample leads)</label>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_LEADS.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSample(s)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                  sample === s
                    ? "border-brand-400 bg-brand-50 text-brand-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {s.firstName} ({s.state})
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">First Name</label>
            <input name="firstName" required className="form-input" defaultValue={sample.firstName} key={`fn-${sample.firstName}`} />
          </div>
          <div>
            <label className="form-label">Last Name</label>
            <input name="lastName" required className="form-input" defaultValue={sample.lastName} key={`ln-${sample.lastName}`} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">Email</label>
            <input name="email" type="email" required className="form-input" defaultValue={sample.email} key={`em-${sample.email}`} />
          </div>
          <div>
            <label className="form-label">Phone</label>
            <input name="phone" required className="form-input" defaultValue={sample.phone} key={`ph-${sample.phone}`} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">State</label>
            <select name="state" className="form-select" defaultValue={sample.state} key={`st-${sample.state}`}>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Intent</label>
            <select name="intent" className="form-select" defaultValue={sample.intent} key={`in-${sample.intent}`}>
              <option value="High Intent">High Intent</option>
              <option value="Traditional">Traditional</option>
            </select>
          </div>
        </div>
        <div>
          <label className="form-label">TrustedForm URL (auto-generated if empty)</label>
          <input name="trustedform" className="form-input" placeholder="https://cert.trustedform.com/…" />
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Submitting…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Zap size={15} />
              Submit Lead to Intake
            </span>
          )}
        </button>
      </form>

      {/* Result panel */}
      <div className="lg:col-span-2">
        <label className="form-label">Response</label>
        {!result && !loading && (
          <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400">
            Submit a lead to see the response
          </div>
        )}
        {loading && (
          <div className="flex h-48 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          </div>
        )}
        {result && (
          <div className={`rounded-xl border ${result.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
            <div className={`flex items-center gap-2 rounded-t-xl px-4 py-2 text-xs font-semibold ${result.ok ? "text-emerald-700" : "text-red-700"}`}>
              {result.ok
                ? <><CheckCircle size={14} /> Success</>
                : <><AlertCircle size={14} /> Error</>
              }
            </div>
            <pre className="overflow-auto rounded-b-xl bg-white/60 px-4 py-3 text-xs text-slate-700">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
