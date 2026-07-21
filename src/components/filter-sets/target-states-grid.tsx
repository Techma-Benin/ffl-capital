"use client";

import {
  US_REGION_STATES,
  US_STATE_CODES,
} from "@/lib/constants/us-states";

export function TargetStatesGrid({
  selected,
  onChange,
  maxHeightClass = "max-h-44",
}: {
  selected: string[];
  onChange: (states: string[]) => void;
  maxHeightClass?: string;
}) {
  const selectedSet = new Set(selected);

  function selectStates(codes: readonly string[]) {
    onChange([...codes]);
  }

  function toggleState(code: string) {
    const next = new Set(selectedSet);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange([...next].sort());
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
      <div
        className={`grid grid-cols-5 gap-1.5 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 sm:grid-cols-10 ${maxHeightClass}`}
      >
        {US_STATE_CODES.map((code) => {
          const isSelected = selectedSet.has(code);
          return (
            <button
              key={code}
              type="button"
              onClick={() => toggleState(code)}
              className={`rounded px-1 py-1.5 text-[10px] font-bold transition-colors ${
                isSelected
                  ? "bg-brand-100 text-brand-700"
                  : "bg-slate-50 text-slate-500 hover:bg-brand-50"
              }`}
            >
              {code}
            </button>
          );
        })}
      </div>
    </div>
  );
}
