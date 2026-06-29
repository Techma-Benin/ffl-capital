"use client";

import { useState } from "react";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

export default function LeadSimulator() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult("");

    const form = new FormData(e.currentTarget);
    const payload = {
      First_Name: form.get("firstName"),
      Last_Name: form.get("lastName"),
      Email: form.get("email"),
      Primary_Phone: form.get("phone"),
      State: form.get("state"),
      Intent: form.get("intent"),
      Trusted_Form_URL: form.get("trustedform") || "https://cert.trustedform.com/dev-test",
      Unique_Identifier: `sim-${Date.now()}`,
      SRC: "dev_simulator",
    };

    try {
      const res = await fetch("/api/leads/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-medium">First name</label>
        <input name="firstName" defaultValue="Jane" required className="mt-1 w-full rounded border px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium">Last name</label>
        <input name="lastName" defaultValue="Doe" required className="mt-1 w-full rounded border px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium">Email</label>
        <input name="email" type="email" defaultValue="jane@example.com" required className="mt-1 w-full rounded border px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium">Phone</label>
        <input name="phone" defaultValue="5125550100" required className="mt-1 w-full rounded border px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium">State</label>
        <select name="state" defaultValue="TX" className="mt-1 w-full rounded border px-3 py-2">
          {US_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium">Intent</label>
        <select name="intent" defaultValue="High Intent" className="mt-1 w-full rounded border px-3 py-2">
          <option value="High Intent">High Intent</option>
          <option value="Traditional">Traditional</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium">TrustedForm URL (optional)</label>
        <input name="trustedform" className="mt-1 w-full rounded border px-3 py-2" />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Sending…" : "Submit lead"}
      </button>
      {result && (
        <pre className="mt-4 overflow-auto rounded bg-neutral-100 p-4 text-xs">
          {result}
        </pre>
      )}
    </form>
  );
}
