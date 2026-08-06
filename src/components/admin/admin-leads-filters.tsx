"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { US_STATE_CODES } from "@/lib/constants/us-states";
import { useNavigateWithPending } from "@/hooks/use-navigate-with-pending";

export function AdminLeadsFilters() {
  const { push: navigate } = useNavigateWithPending();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [state, setState] = useState(searchParams.get("state") ?? "");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushFilters(overrides: { q?: string; state?: string; from?: string; to?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const values = { q, state, from, to, ...overrides };
    if (values.q?.trim()) params.set("q", values.q.trim()); else params.delete("q");
    if (values.state) params.set("state", values.state); else params.delete("state");
    if (values.from) params.set("from", values.from); else params.delete("from");
    if (values.to) params.set("to", values.to); else params.delete("to");
    params.delete("page");
    navigate(`/admin/leads?${params.toString()}`);
  }

  // Debounce the text search input
  function handleQ(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushFilters({ q: value }), 400);
  }

  // Instant push for select/date fields
  function handleState(value: string) { setState(value); pushFilters({ state: value }); }
  function handleFrom(value: string)  { setFrom(value);  pushFilters({ from: value });  }
  function handleTo(value: string)    { setTo(value);    pushFilters({ to: value });    }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-4 py-3">
      <div className="min-w-[200px] flex-1">
        <label className="form-label text-[10px]">Search</label>
        <input
          type="search"
          value={q}
          onChange={(e) => handleQ(e.target.value)}
          placeholder="ID, email, phone, external ID"
          className="form-input py-1.5 text-xs w-full"
        />
      </div>
      <div>
        <label className="form-label text-[10px]">State</label>
        <select
          value={state}
          onChange={(e) => handleState(e.target.value)}
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
          onChange={(e) => handleFrom(e.target.value)}
          className="form-input py-1.5 text-xs"
        />
      </div>
      <div>
        <label className="form-label text-[10px]">To</label>
        <input
          type="date"
          value={to}
          onChange={(e) => handleTo(e.target.value)}
          className="form-input py-1.5 text-xs"
        />
      </div>
    </div>
  );
}
