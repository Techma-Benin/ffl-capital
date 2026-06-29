"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { US_STATE_CODES } from "@/lib/constants/us-states";

export default function OnboardingForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);

  function toggleState(code: string) {
    setSelectedStates((prev) =>
      prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code],
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      firstName: form.get("firstName"),
      lastName: form.get("lastName"),
      affiliation: form.get("affiliation"),
      residenceState: form.get("residenceState"),
      leadType: form.get("leadType"),
      filterStates: selectedStates,
    };

    try {
      const res = await fetch("/api/partners/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Onboarding failed");
        return;
      }
      router.push("/partner");
      router.refresh();
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">First name</label>
          <input name="firstName" required className="mt-1 w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Last name</label>
          <input name="lastName" required className="mt-1 w-full rounded border px-3 py-2" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium">Company / affiliation</label>
        <input name="affiliation" required className="mt-1 w-full rounded border px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium">Residence state</label>
        <select name="residenceState" required className="mt-1 w-full rounded border px-3 py-2">
          {US_STATE_CODES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium">Lead type</label>
        <select name="leadType" required className="mt-1 w-full rounded border px-3 py-2">
          <option value="high_intent_iul">High Intent IUL</option>
          <option value="traditional_iul">Traditional IUL</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium">
          Target states ({selectedStates.length}/15 minimum)
        </label>
        <div className="mt-2 grid max-h-48 grid-cols-5 gap-1 overflow-y-auto rounded border p-2 text-xs">
          {US_STATE_CODES.map((s) => (
            <label key={s} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={selectedStates.includes(s)}
                onChange={() => toggleState(s)}
              />
              {s}
            </label>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || selectedStates.length < 15}
        className="w-full rounded bg-blue-600 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Saving…" : "Complete onboarding"}
      </button>
    </form>
  );
}
