"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { US_STATE_CODES } from "@/lib/constants/us-states";

export function AdminLeadsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState(searchParams.get("state") ?? "");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  function apply() {
    const params = new URLSearchParams(searchParams.toString());
    if (state) params.set("state", state);
    else params.delete("state");
    if (from) params.set("from", from);
    else params.delete("from");
    if (to) params.set("to", to);
    else params.delete("to");
    router.push(`/admin/leads?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-4 py-3">
      <div>
        <label className="form-label text-[10px]">State</label>
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="form-select py-1.5 text-xs w-28"
        >
          <option value="">All</option>
          {US_STATE_CODES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="form-label text-[10px]">From</label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="form-input py-1.5 text-xs"
        />
      </div>
      <div>
        <label className="form-label text-[10px]">To</label>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="form-input py-1.5 text-xs"
        />
      </div>
      <button type="button" onClick={apply} className="btn-secondary btn-sm">
        Apply
      </button>
    </div>
  );
}
