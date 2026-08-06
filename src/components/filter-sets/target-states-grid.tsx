"use client";

import {
  US_REGION_STATES,
  US_STATE_CODES,
} from "@/lib/constants/us-states";
import { StateChipGrid } from "@/components/filter-sets/state-chip-grid";

export function TargetStatesGrid({
  selected,
  onChange,
  scrollable = false,
}: {
  selected: string[];
  onChange: (states: string[]) => void;
  /** Compact capped height with vertical scroll (e.g. dense filter-set forms). */
  scrollable?: boolean;
}) {
  const selectedSet = new Set(selected);

  function selectStates(codes: readonly string[]) {
    onChange([...codes]);
  }

  function toggleState(code: string) {
    const next = new Set(selectedSet);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange(Array.from(next).sort());
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-medium text-slate-500">
          {selected.length} / {US_STATE_CODES.length} selected
          {selected.length === 0 ? " (all states)" : ""}
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => selectStates(US_STATE_CODES)}
            className="btn-secondary btn-sm"
          >
            All
          </button>
          <button
            type="button"
            onClick={() => selectStates([])}
            className="btn-secondary btn-sm"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => selectStates(US_REGION_STATES.southeast)}
            className="btn-secondary btn-sm"
          >
            Southeast
          </button>
          <button
            type="button"
            onClick={() => selectStates(US_REGION_STATES.northeast)}
            className="btn-secondary btn-sm"
          >
            Northeast
          </button>
          <button
            type="button"
            onClick={() => selectStates(US_REGION_STATES.midwest)}
            className="btn-secondary btn-sm"
          >
            Midwest
          </button>
          <button
            type="button"
            onClick={() => selectStates(US_REGION_STATES.west)}
            className="btn-secondary btn-sm"
          >
            West
          </button>
        </div>
      </div>
      <StateChipGrid
        ariaLabel="Target states"
        options={US_STATE_CODES.map((code) => ({ value: code, label: code }))}
        selected={selected}
        onToggle={toggleState}
        scrollable={scrollable}
      />
    </div>
  );
}
